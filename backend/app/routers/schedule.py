from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from ..models import (
    Conflict,
    GenerateRequest,
    GenerateResponse,
    LockedSlot,
    ResolveConflictRequest,
    TimetableEntry,
    TimetableVersion,
)
from ..store import store
from ..solver.engine import generate_timetable

router = APIRouter(prefix="/schedule", tags=["schedule"])


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


@router.post("/generate", response_model=dict)
def generate_schedule(payload: GenerateRequest) -> dict:
    # Using direct synchronous OR-tools engine for real-time calculation
    result = generate_timetable("dept_id", "version_id")
    return result


@router.post("/conflicts/{conflict_id}/resolve", response_model=Conflict)
def resolve_conflict(conflict_id: str, payload: ResolveConflictRequest) -> Conflict:
    try:
        return Conflict.model_validate(store.resolve_conflict(conflict_id, payload.resolution))
    except KeyError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
