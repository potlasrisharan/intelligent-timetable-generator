from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel


UserRole = Literal["SUPER_ADMIN", "DEPARTMENT_ADMIN", "FACULTY", "STUDENT"]
AppStatus = Literal["healthy", "warning", "critical", "inactive"]
ConflictSeverity = Literal["critical", "high", "medium", "low"]
TimetableVersionStatus = Literal["DRAFT", "ACTIVE", "ARCHIVED"]


class Department(BaseModel):
    id: str
    name: str
    shortCode: str
    campus: str
    sections: int


class Course(BaseModel):
    id: str
    code: str
    name: str
    departmentId: str
    semester: int
    theoryHours: int
    practicalHours: int
    labRequired: bool
    facultyId: str
    sectionIds: list[str]
    status: Literal["scheduled", "draft", "review"]


class Faculty(BaseModel):
    id: str
    name: str
    designation: str
    departmentId: str
    maxPeriodsPerDay: int
    weeklyLoad: int
    availability: str
    preferences: list[str]
    status: Literal["balanced", "high_load", "limited"]


class Room(BaseModel):
    id: str
    name: str
    block: str
    capacity: int
    roomType: Literal["CLASSROOM", "LAB"]
    departmentExclusive: str | None = None
    utilization: int


class Section(BaseModel):
    id: str
    name: str
    departmentId: str
    semester: int
    studentCount: int
    advisor: str
    compactness: int


class CombinedSection(BaseModel):
    id: str
    label: str
    courseCode: str
    semester: int
    sectionIds: list[str]
    combinedStudentCount: int
    facultyId: str
    roomId: str


class Timeslot(BaseModel):
    id: str
    label: str
    start: str
    end: str
    isLunch: bool | None = None


class Holiday(BaseModel):
    id: str
    name: str
    date: str
    scope: str
    impact: str


class TimetableVersion(BaseModel):
    id: str
    label: str
    departmentId: str
    status: TimetableVersionStatus
    generatedAt: str
    qualityScore: int
    lockedSlots: int
    notes: str


class TimetableEntry(BaseModel):
    id: str
    day: str
    timeslotId: str
    sectionId: str
    courseCode: str
    courseName: str
    facultyName: str
    roomName: str
    type: Literal["THEORY", "LAB"]
    locked: bool | None = None
    combined: bool | None = None
    note: str | None = None


class LockedSlot(BaseModel):
    id: str
    day: str
    timeslotId: str
    sectionId: str
    reason: str
    lockedBy: str


class Conflict(BaseModel):
    id: str
    severity: ConflictSeverity
    title: str
    description: str
    ruleCode: str
    affected: list[str]
    suggestedFixes: list[str]
    qualityImpact: int
    status: Literal["open", "resolved"]


class AuditEvent(BaseModel):
    id: str
    actor: str
    action: str
    target: str
    timestamp: str
    tone: Literal["info", "success", "warning"]


class MetricPoint(BaseModel):
    label: str
    value: int
    emphasis: str | None = None


class DashboardMetrics(BaseModel):
    solverStatus: AppStatus
    solverLabel: str
    queueDepth: int
    generationProgress: int
    roomUtilization: int
    facultyLoadBalance: int
    unresolvedConflicts: int
    activeVersion: TimetableVersion
    draftVersion: TimetableVersion
    recentActions: list[AuditEvent]
    utilizationByDepartment: list[MetricPoint]
    facultyWorkloadSnapshot: list[MetricPoint]
    compactnessSnapshot: list[MetricPoint]


class ReportExport(BaseModel):
    label: str
    description: str


class ReportSummary(BaseModel):
    roomUtilization: list[MetricPoint]
    facultyGaps: list[MetricPoint]
    compactness: list[MetricPoint]
    exports: list[ReportExport]


class AuthUser(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    department: str


class SessionState(BaseModel):
    status: Literal["loading", "authenticated", "unauthenticated"]
    user: AuthUser | None


class SignInRequest(BaseModel):
    email: str
    password: str | None = None


class ForgotPasswordRequest(BaseModel):
    email: str


class GenerateRequest(BaseModel):
    scope: Literal["partial", "full", "repair"] = "partial"


class GenerateResponse(BaseModel):
    ok: bool = True
    message: str
    versionId: str
    qualityScore: int


class ResolveConflictRequest(BaseModel):
    resolution: str | None = None


class MessageResponse(BaseModel):
    ok: bool = True
    message: str


class DeleteResponse(BaseModel):
    ok: bool = True
    message: str


class GenericMutationPayload(BaseModel):
    data: dict[str, Any]
