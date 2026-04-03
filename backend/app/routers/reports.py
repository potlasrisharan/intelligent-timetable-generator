from __future__ import annotations

from fastapi import APIRouter

from ..models import AuditEvent, ReportSummary, TimetableVersion
from ..store import store

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/summary", response_model=ReportSummary)
def get_summary() -> ReportSummary:
    return ReportSummary.model_validate(store.get_report_summary())


@router.get("/history", response_model=list[TimetableVersion])
def get_history() -> list[TimetableVersion]:
    return [TimetableVersion.model_validate(item) for item in store.list("timetableVersions")]


@router.get("/audit-trail", response_model=list[AuditEvent])
def get_audit_trail() -> list[AuditEvent]:
    return [AuditEvent.model_validate(item) for item in store.list("auditTrail")]
