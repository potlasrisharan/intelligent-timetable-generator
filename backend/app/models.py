from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


UserRole = Literal["ADMIN", "TEACHER", "STUDENT"]
AppStatus = Literal["healthy", "warning", "critical", "inactive"]
ConflictSeverity = Literal["critical", "high", "medium", "low"]
TimetableVersionStatus = Literal["DRAFT", "ACTIVE", "ARCHIVED"]
ConstraintScope = Literal["global", "faculty", "section", "room", "course"]
ConstraintKind = Literal[
    "faculty_max_periods_per_day",
    "faculty_unavailable_slot",
    "section_unavailable_slot",
    "room_unavailable_slot",
    "course_required_room",
    "holiday_block_day",
]


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


class ManualEntryRequest(BaseModel):
    day: str
    timeslotId: str
    sectionId: str
    courseCode: str
    courseName: str
    facultyName: str
    roomName: str
    type: Literal["THEORY", "LAB"]


class ConstraintRule(BaseModel):
    id: str
    scope: ConstraintScope
    kind: ConstraintKind
    targetId: str | None = None
    targetLabel: str | None = None
    detail: str
    parameters: dict[str, Any] = Field(default_factory=dict)
    sourceFile: str | None = None
    enabled: bool = True


class ImportCsvResponse(BaseModel):
    status: Literal["success"] = "success"
    message: str
    collection: str
    importedCount: int
    constraintsApplied: int = 0
    constraints: list[ConstraintRule] = Field(default_factory=list)
    assistantNote: str | None = None


AiSuggestionImpact = Literal["high", "medium", "low"]
AiSuggestionCategory = Literal["quality", "conflict", "reschedule", "assistant"]
ChatMessageRole = Literal["user", "assistant"]


class AiSuggestion(BaseModel):
    id: str
    title: str
    detail: str
    impact: AiSuggestionImpact
    category: AiSuggestionCategory


class QualityReviewResponse(BaseModel):
    generatedAt: str
    score: int
    summary: str
    strengths: list[str]
    suggestions: list[AiSuggestion]
    assistantNote: str | None = None


class ConflictPrediction(BaseModel):
    id: str
    title: str
    detail: str
    severity: ConflictSeverity
    confidence: int
    affected: list[str]
    suggestion: str


class ConflictPredictionResponse(BaseModel):
    generatedAt: str
    summary: str
    predictions: list[ConflictPrediction]
    assistantNote: str | None = None


class AutoRescheduleChange(BaseModel):
    entryId: str
    courseCode: str
    fromLabel: str
    toLabel: str
    rationale: str


class AutoRescheduleResponse(BaseModel):
    ok: bool = True
    applied: bool
    conflictId: str
    resolution: str
    summary: str
    changes: list[AutoRescheduleChange]
    assistantNote: str | None = None


class AutoRescheduleAllResponse(BaseModel):
    ok: bool = True
    resolvedCount: int
    failedCount: int
    message: str


class AiChatMessage(BaseModel):
    role: ChatMessageRole
    content: str = Field(min_length=1, max_length=2000)


class AiChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[AiChatMessage] = Field(default_factory=list, max_length=12)
    page: str | None = None


class AiChatResponse(BaseModel):
    ok: bool = True
    reply: str
    suggestedPrompts: list[str]
