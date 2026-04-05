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
)
from ..store import store
from ..solver.engine import generate_timetable

router = APIRouter(prefix="/schedule", tags=["schedule"])

# In-memory job tracker (sufficient for hackathon / single-process demo)
_jobs: dict[str, dict[str, Any]] = {}
_jobs_lock = threading.Lock()


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
        with _jobs_lock:
            _jobs[job_id].update({
                "status": "error",
                "progress": 0,
                "result": {
                    "status": "error",
                    "message": str(exc),
                    "quality_score": 0,
                },
            })


@router.post("/generate", response_model=dict)
def generate_schedule(payload: GenerateRequest) -> dict:
    """
    Starts the OR-Tools solver in a background thread and returns a job_id
    immediately. Poll GET /schedule/generate/status/{job_id} for progress.
    """
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
