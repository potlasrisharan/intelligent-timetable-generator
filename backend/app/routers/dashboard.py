from __future__ import annotations

from fastapi import APIRouter

from ..models import DashboardMetrics, TimetableVersion
from ..store import store

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/metrics", response_model=DashboardMetrics)
def get_dashboard_metrics() -> DashboardMetrics:
    return DashboardMetrics.model_validate(store.get_dashboard_metrics())


@router.get("/versions", response_model=list[TimetableVersion])
def get_versions() -> list[TimetableVersion]:
    return [TimetableVersion.model_validate(item) for item in store.list("timetableVersions")]
