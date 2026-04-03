export type UserRole =
  | "SUPER_ADMIN"
  | "DEPARTMENT_ADMIN"
  | "FACULTY"
  | "STUDENT"

export type AppStatus = "healthy" | "warning" | "critical" | "inactive"
export type ConflictSeverity = "critical" | "high" | "medium" | "low"
export type TimetableVersionStatus = "DRAFT" | "ACTIVE" | "ARCHIVED"

export type Department = {
  id: string
  name: string
  shortCode: string
  campus: string
  sections: number
}

export type Course = {
  id: string
  code: string
  name: string
  departmentId: string
  semester: number
  theoryHours: number
  practicalHours: number
  labRequired: boolean
  facultyId: string
  sectionIds: string[]
  status: "scheduled" | "draft" | "review"
}

export type Faculty = {
  id: string
  name: string
  designation: string
  departmentId: string
  maxPeriodsPerDay: number
  weeklyLoad: number
  availability: string
  preferences: string[]
  status: "balanced" | "high_load" | "limited"
}

export type Room = {
  id: string
  name: string
  block: string
  capacity: number
  roomType: "CLASSROOM" | "LAB"
  departmentExclusive?: string
  utilization: number
}

export type Section = {
  id: string
  name: string
  departmentId: string
  semester: number
  studentCount: number
  advisor: string
  compactness: number
}

export type CombinedSection = {
  id: string
  label: string
  courseCode: string
  semester: number
  sectionIds: string[]
  combinedStudentCount: number
  facultyId: string
  roomId: string
}

export type Timeslot = {
  id: string
  label: string
  start: string
  end: string
  isLunch?: boolean
}

export type Holiday = {
  id: string
  name: string
  date: string
  scope: string
  impact: string
}

export type TimetableVersion = {
  id: string
  label: string
  departmentId: string
  status: TimetableVersionStatus
  generatedAt: string
  qualityScore: number
  lockedSlots: number
  notes: string
}

export type TimetableEntry = {
  id: string
  day: string
  timeslotId: string
  sectionId: string
  courseCode: string
  courseName: string
  facultyName: string
  roomName: string
  type: "THEORY" | "LAB"
  locked?: boolean
  combined?: boolean
  note?: string
}

export type LockedSlot = {
  id: string
  day: string
  timeslotId: string
  sectionId: string
  reason: string
  lockedBy: string
}

export type Conflict = {
  id: string
  severity: ConflictSeverity
  title: string
  description: string
  ruleCode: string
  affected: string[]
  suggestedFixes: string[]
  qualityImpact: number
  status: "open" | "resolved"
}

export type AuditEvent = {
  id: string
  actor: string
  action: string
  target: string
  timestamp: string
  tone: "info" | "success" | "warning"
}

export type MetricPoint = {
  label: string
  value: number
  emphasis?: string
}

export type DashboardMetrics = {
  solverStatus: AppStatus
  solverLabel: string
  queueDepth: number
  generationProgress: number
  roomUtilization: number
  facultyLoadBalance: number
  unresolvedConflicts: number
  activeVersion: TimetableVersion
  draftVersion: TimetableVersion
  recentActions: AuditEvent[]
  utilizationByDepartment: MetricPoint[]
  facultyWorkloadSnapshot: MetricPoint[]
  compactnessSnapshot: MetricPoint[]
}

export type ReportSummary = {
  roomUtilization: MetricPoint[]
  facultyGaps: MetricPoint[]
  compactness: MetricPoint[]
  exports: { label: string; description: string }[]
}

export type AuthUser = {
  id: string
  name: string
  email: string
  role: UserRole
  department: string
}

export type SessionState = {
  status: "loading" | "authenticated" | "unauthenticated"
  user: AuthUser | null
}
