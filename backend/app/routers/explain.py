from __future__ import annotations

from fastapi import APIRouter
from ..solver.engine import get_xai_explanations

router = APIRouter(prefix="/schedule", tags=["explain"])


@router.get("/explain")
def get_schedule_explanations() -> list[dict]:
    """
    XAI Endpoint — Returns plain-English explanations for every currently
    scheduled timetable entry. Explains *why* each course was placed in its
    specific room/timeslot based on constraint satisfaction logic.
    """
    return get_xai_explanations()
