from __future__ import annotations

import threading
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, status

from ..models import (
    Conflict,
    GenerateRequest,
    LockedSlot,
    ResolveConflictRequest,
    TimetableEntry,
    TimetableVersion,
    ManualEntryRequest,
)
from ..store import store
from ..solver.engine import generate_timetable

router = APIRouter(prefix="/schedule", tags=["schedule"])

# In-memory job tracker (sufficient for hackathon / single-process demo)
_jobs: dict[str, dict[str, Any]] = {}
_jobs_lock = threading.Lock()
_MAX_CONCURRENT_SOLVER_JOBS = 2  # MED-4: Prevent thread exhaustion


@router.get("/entries", response_model=list[TimetableEntry])
def get_entries() -> list[TimetableEntry]:
    return [TimetableEntry.model_validate(item) for item in store.list("editorEntries")]


@router.get("/locked-slots", response_model=list[LockedSlot])
def get_locked_slots() -> list[LockedSlot]:
    return [LockedSlot.model_validate(item) for item in store.list("lockedSlots")]


@router.get("/conflicts", response_model=list[Conflict])
def get_conflicts() -> list[Conflict]:
    return [Conflict.model_validate(item) for item in store.list("conflicts")]


@router.get("/versions", response_model=list[TimetableVersion])
def get_versions() -> list[TimetableVersion]:
    return [TimetableVersion.model_validate(item) for item in store.list("timetableVersions")]


def _run_solver_job(job_id: str, scope: str) -> None:
    """Background thread: runs solver and updates job state."""
    with _jobs_lock:
        _jobs[job_id]["status"] = "running"
        _jobs[job_id]["progress"] = 10

    try:
        # Checkpoint: constraints built (25%)
        with _jobs_lock:
            _jobs[job_id]["progress"] = 25

        result = generate_timetable("dept_id", "version_id")

        with _jobs_lock:
            _jobs[job_id].update({
                "status": "done",
                "progress": 100,
                "result": result,
            })
    except Exception as exc:
        import logging
        logging.getLogger(__name__).error("Solver job %s failed: %s", job_id, exc)
        with _jobs_lock:
            _jobs[job_id].update({
                "status": "error",
                "progress": 0,
                "result": {
                    "status": "error",
                    "message": "Schedule generation failed. Please review your inputs and try again.",
                    "quality_score": 0,
                },
            })


@router.post("/generate", response_model=dict)
def generate_schedule(payload: GenerateRequest) -> dict:
    """
    Starts the OR-Tools solver in a background thread and returns a job_id
    immediately. Poll GET /schedule/generate/status/{job_id} for progress.
    """
    # MED-4: Enforce concurrent solver limit
    with _jobs_lock:
        active_count = sum(1 for j in _jobs.values() if j["status"] in ("queued", "running"))
        if active_count >= _MAX_CONCURRENT_SOLVER_JOBS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many solver jobs in progress. Please wait for the current job to finish.",
            )

    job_id = f"job-{uuid.uuid4().hex[:10]}"
    with _jobs_lock:
        _jobs[job_id] = {"status": "queued", "progress": 0, "result": None}

    thread = threading.Thread(
        target=_run_solver_job,
        args=(job_id, payload.scope),
        daemon=True,
    )
    thread.start()

    return {"job_id": job_id, "status": "queued", "message": "Solver job queued. Poll /generate/status/{job_id}."}


@router.get("/generate/status/{job_id}", response_model=dict)
def get_generate_status(job_id: str) -> dict:
    """Poll this endpoint to get real-time solver progress (0-100%)."""
    with _jobs_lock:
        job = _jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_id} not found.")
    return {
        "job_id": job_id,
        "status": job["status"],       # queued | running | done | error
        "progress": job["progress"],   # 0-100
        "result": job.get("result"),   # populated when done
    }


@router.post("/conflicts/{conflict_id}/resolve", response_model=Conflict)
def resolve_conflict(conflict_id: str, payload: ResolveConflictRequest) -> Conflict:
    try:
        return Conflict.model_validate(store.resolve_conflict(conflict_id, payload.resolution))
    except KeyError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error


@router.post("/manual-entry", response_model=TimetableEntry)
def add_manual_entry(payload: ManualEntryRequest) -> TimetableEntry:
    entry_dict = {
        "id": f"evt-man-{uuid.uuid4().hex[:8]}",
        "day": payload.day,
        "timeslotId": payload.timeslotId,
        "sectionId": payload.sectionId,
        "courseCode": payload.courseCode,
        "courseName": payload.courseName,
        "facultyName": payload.facultyName,
        "roomName": payload.roomName,
        "type": payload.type,
        "locked": True,
        "combined": False,
        "note": "Manually assigned block",
    }
    # Add to the global store using store.create so it syncs to DB if enabled
    store.create("editorEntries", entry_dict)
    
    return TimetableEntry.model_validate(entry_dict)


@router.post("/publish", response_model=dict)
def publish_timetable() -> dict:
    """
    Publish the current editor timetable so it becomes visible to
    Teacher and Student dashboards.
    - Copies editorEntries → publishedEntries
    - Marks the latest DRAFT version as ACTIVE
    - Appends an audit trail event
    """
    from datetime import datetime

    src = store.fallback if hasattr(store, "fallback") else store

    # 1. Copy current editor entries to published store
    editor_entries = src.data.get("editorEntries", [])
    if not editor_entries:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No timetable entries to publish. Generate a timetable first.",
        )

    src.data["publishedEntries"] = list(editor_entries)

    # 2. Mark DRAFT versions as ACTIVE
    versions = src.data.get("timetableVersions", [])
    published_version_name = None
    for v in versions:
        if v.get("status") == "DRAFT":
            v["status"] = "ACTIVE"
            v["notes"] = f"Published on {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            published_version_name = v.get("label", v.get("id", "Unknown"))

    # 3. Audit trail
    src.data.setdefault("auditTrail", []).insert(0, {
        "id": f"evt-pub-{uuid.uuid4().hex[:6]}",
        "actor": "Admin",
        "action": "Published timetable",
        "target": published_version_name or "Master Schedule",
        "timestamp": "just now",
        "tone": "success",
    })

    return {
        "status": "published",
        "entries_count": len(editor_entries),
        "version": published_version_name or "Master Schedule",
        "message": f"Published {len(editor_entries)} entries. Teachers and students can now see the schedule.",
    }


@router.get("/published-entries", response_model=list[TimetableEntry])
def get_published_entries() -> list[TimetableEntry]:
    """Return published timetable entries for Teacher/Student dashboards."""
    src = store.fallback if hasattr(store, "fallback") else store
    published = src.data.get("publishedEntries", [])
    # Fall back to editor entries if nothing published yet (backward compatible)
    if not published:
        published = src.data.get("editorEntries", [])
    return [TimetableEntry.model_validate(item) for item in published]

