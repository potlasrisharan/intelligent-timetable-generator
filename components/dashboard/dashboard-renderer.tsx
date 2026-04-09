"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import {
  BookOpen, Calendar, Clock,
  Cpu, GitBranch, Upload, WandSparkles, Zap,
  BarChart3, Layers, GraduationCap,
} from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/lib/services/auth-service"
import type {
  ConstraintRule,
  CsvImportResult,
  DashboardMetrics,
  Section,
  UserRole,
  TimetableEntry,
} from "@/lib/types"
import { envConfig } from "@/lib/config"
import { scheduleService } from "@/lib/services/schedule-service"
import { ExportTimetableButton } from "@/components/shared/export-button"
import { DashboardAiPanels } from "@/components/ai/dashboard-ai-panels"
import { aiService } from "@/lib/services/ai-service"

const API_BASE = envConfig.apiBaseUrl

// ─────────────────────────────────────────────────────────────
// Real polling progress bar
// ─────────────────────────────────────────────────────────────
type JobStatus = "idle" | "queued" | "running" | "done" | "error"

type SolverResult = {
  status: string
  solver_status?: string
  quality_score?: number
  entries_generated?: number
  elapsed_ms?: number
  message?: string
}

function asSolverResult(r: Record<string, unknown> | null): SolverResult | null {
  return r as SolverResult | null
}

function useGenerateJob() {
  const [jobStatus, setJobStatus] = useState<JobStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const startGenerate = useCallback(async () => {
    setJobStatus("queued")
    setProgress(5)
    setResult(null)

    try {
      const res = await fetch(`${API_BASE}/schedule/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "full" }),
      })
      const data = await res.json() as { job_id?: string; detail?: string }

      if (!res.ok) throw new Error(data.detail || "Generate failed")

      const newJobId: string = data.job_id ?? ""
      setJobStatus("running")

      // Simulated smooth progress from 5→90 while waiting for solver
      let visual = 5
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`${API_BASE}/schedule/generate/status/${newJobId}`)
          const statusData = await statusRes.json() as { status: string; progress: number; result: Record<string, unknown> }

          // Blend real progress (0-100) with visual smoothing
          const realProgress = statusData.progress
          visual = Math.max(visual, Math.min(realProgress * 0.9 + 5, 92))
          setProgress(Math.round(visual))

          if (statusData.status === "done" || statusData.status === "error") {
            stopPolling()
            setProgress(100)
            setJobStatus(statusData.status as JobStatus)
            setResult(statusData.result)
          }
        } catch {
          // Network hiccup — keep polling
        }
      }, 400)
    } catch (err) {
      setJobStatus("error")
      setProgress(0)
      setResult({ status: "error", message: String(err), quality_score: 0 })
    }
  }, [stopPolling])

  useEffect(() => () => stopPolling(), [stopPolling])

  return { jobStatus, progress, result, startGenerate }
}

// ─────────────────────────────────────────────────────────────
// Progress bar component
// ─────────────────────────────────────────────────────────────
function SolverProgressBar({ status, progress, result }: {
  status: JobStatus
  progress: number
  result: Record<string, unknown> | null
}) {
  if (status === "idle") return null

  const r = asSolverResult(result)
  const isSuccess = status === "done" && r?.status === "success"
  const isError = status === "error" || r?.status === "error"
  const isDone = status === "done"

  const phaseLabel =
    progress < 15 ? "Preparing timetable…" :
    progress < 30 ? "Loading data…" :
    progress < 50 ? "Checking rules…" :
    progress < 70 ? "Generating schedule…" :
    progress < 90 ? "Saving results…" :
    isDone
      ? isSuccess
        ? `✓ Done — Quality Score: ${r?.quality_score ?? "—"}`
        : `✗ ${r?.message ?? "Error"}`
      : "Finalising…"

  return (
    <div className="flex flex-col gap-2 min-w-[260px]">
      <div className="flex items-center justify-between gap-3">
        <span className={`text-xs font-data ${isError ? "text-red-400" : isSuccess ? "text-emerald-300" : "text-amber-300"}`}>
          {phaseLabel}
        </span>
        <span className="text-xs text-slate-400 tabular-nums">{progress}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isError ? "bg-red-500" : isSuccess ? "bg-emerald-400" : "bg-amber-300"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

function formatConstraintRule(rule: ConstraintRule) {
  const label = rule.targetLabel || "Global rule"
  const parameters = rule.parameters as Record<string, unknown>
  if (rule.kind === "faculty_max_periods_per_day") {
    const value = parameters["maxPeriodsPerDay"]
    return `${label} capped at ${String(value)} periods/day`
  }
  if (rule.kind === "course_required_room") {
    const room = parameters["roomName"] || "specified room"
    return `${label} locked to ${String(room)}`
  }
  if (rule.kind === "holiday_block_day") {
    const day = parameters["day"] || "configured day"
    return `${label} blocks ${String(day)}`
  }
  const day = parameters["day"] || "configured day"
  const rawTimeslotIds = parameters["timeslotIds"]
  const timeslotIds = Array.isArray(rawTimeslotIds)
    ? rawTimeslotIds.map((item) => String(item).toUpperCase()).join(", ")
    : ""
  return `${label} unavailable on ${String(day)}${timeslotIds ? ` · ${timeslotIds}` : ""}`
}

// ─────────────────────────────────────────────────────────────
// Main dashboard renderer
// ─────────────────────────────────────────────────────────────
export function DashboardRenderer({
  metrics,
  sections,
}: {
  metrics: DashboardMetrics
  sections: Section[]
}) {
  const [role, setRole] = useState<UserRole | null>(null)
  const [userMeta, setUserMeta] = useState<{ name: string; sectionId?: string; facultyName?: string }>({ name: "" })
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([])

  // Admin-only form state
  const [entryMode, setEntryMode] = useState<"infrastructure" | "course">("infrastructure")
  const [roomName, setRoomName] = useState("")
  const [capacity, setCapacity] = useState("")
  const [targetBranch, setTargetBranch] = useState("")
  const [sectionName, setSectionName] = useState("")
  const [studentCount, setStudentCount] = useState("")
  const [courseCode, setCourseCode] = useState("")
  const [courseName, setCourseName] = useState("")
  const [theoryHours, setTheoryHours] = useState("")
  const [facultyName, setFacultyName] = useState("")
  const [poolItems, setPoolItems] = useState<string[]>([])
  const [uploadSummary, setUploadSummary] = useState<CsvImportResult | null>(null)
  const [constraintRules, setConstraintRules] = useState<ConstraintRule[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { jobStatus, progress, result, startGenerate } = useGenerateJob()
  const isGenerating = jobStatus === "queued" || jobStatus === "running"

  const solverResult = asSolverResult(result)
  const qScore = solverResult?.quality_score ?? metrics.activeVersion.qualityScore

  // Read session once on mount
  useEffect(() => {
    const session = authService.getSession()
    const user = session.user
    setRole(user?.role || "ADMIN")
    setUserMeta({
      name: user?.name || "",
      sectionId: user?.sectionId,
      facultyName: user?.facultyName,
    })
  }, [])

  // Always load timetable entries (needed for Teacher + Student views, and after generate)
  useEffect(() => {
    scheduleService.getEditorEntries().then(setTimetableEntries)
  }, [])

  useEffect(() => {
    aiService.getConstraintRules().then(setConstraintRules)
  }, [])

  // Refresh entries after a successful generate (Admin only)
  useEffect(() => {
    if (jobStatus === "done" && solverResult?.status === "success") {
      scheduleService.getEditorEntries().then(setTimetableEntries)
    }
  }, [jobStatus, solverResult?.status])

  if (!role) return null

  // ── STUDENT VIEW — read-only, section-filtered ────────────
  if (role === "STUDENT") {
    const mySectionId = userMeta.sectionId ?? "cse-3a"
    const mySection = sections.find((s) => s.id === mySectionId) ?? sections[0]
    const myEntries = timetableEntries
      .filter((e) => e.sectionId === mySectionId)
      .sort((a, b) => {
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
        return days.indexOf(a.day) - days.indexOf(b.day)
      })

    const published = timetableEntries.length > 0 || metrics.activeVersion.status === "ACTIVE"

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Student Portal"
          title="My Timetable"
          description={`Showing classes for ${mySection?.name ?? mySectionId}. Contact your admin if the schedule looks incomplete.`}
          actions={<ExportTimetableButton />}
        />

        {/* Identity banner */}
        <div className="flex items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-5 ring-1 ring-white/5">
          <GraduationCap className="size-8 shrink-0 text-emerald-300" />
          <div>
            <p className="font-semibold text-white">{userMeta.name}</p>
            <p className="text-sm text-emerald-300">{mySection?.name} · Semester {mySection?.semester} · {mySection?.advisor}</p>
          </div>
          <StatusBadge tone="healthy">
            {myEntries.length} classes this week
          </StatusBadge>
        </div>

        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader>
            <CardTitle className="text-xl text-white">This Week&apos;s Schedule</CardTitle>
            <p className="text-sm text-slate-400">All classes currently assigned to your section.</p>
          </CardHeader>
          <CardContent>
            {published && myEntries.length > 0 ? (
              <div className="space-y-2">
                {myEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/4 p-4">
                    <div className="w-24 shrink-0">
                      <p className="font-semibold text-white text-sm">{entry.day}</p>
                      <p className="font-data text-xs uppercase text-slate-400">{entry.timeslotId}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{entry.courseName}</p>
                      <p className="text-sm text-slate-400">
                        {entry.facultyName} &middot; Room: {entry.roomName}
                      </p>
                    </div>
                    <StatusBadge tone={entry.type === "LAB" ? "active" : "healthy"}>
                      {entry.type}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <Calendar className="mx-auto size-12 text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-300">
                  {published ? "No classes assigned to your section yet" : "Timetable Not Published Yet"}
                </h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">
                  The admin needs to generate the schedule first. Check back shortly.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── TEACHER VIEW — read-only, faculty-filtered ────────────
  if (role === "TEACHER") {
    const myFacultyName = userMeta.facultyName ?? userMeta.name
    const myEntries = timetableEntries
      .filter((e) => e.facultyName === myFacultyName)
      .sort((a, b) => {
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
        return days.indexOf(a.day) - days.indexOf(b.day)
      })

    const uniqueDays = new Set(myEntries.map((e) => e.day)).size
    const labCount = myEntries.filter((e) => e.type === "LAB").length
    const theoryCount = myEntries.filter((e) => e.type === "THEORY").length

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Teacher Portal"
          title="My Schedule"
          description="Your assigned classes. Contact admin to update availability or request slot changes."
          actions={<ExportTimetableButton />}
        />

        {/* Identity banner */}
        <div className="flex items-center gap-4 rounded-2xl border border-blue-500/20 bg-blue-500/8 p-5 ring-1 ring-white/5">
          <BookOpen className="size-8 shrink-0 text-blue-300" />
          <div>
            <p className="font-semibold text-white">{userMeta.name}</p>
            <p className="text-sm text-blue-300">{userMeta.name.replace("Prof. ", "").replace("Dr. ", "")} · {userMeta.name.startsWith("Dr.") ? "Professor" : "Associate Professor"} · {userMeta.name && "Computer Science"}</p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Classes", value: myEntries.length || "—", icon: BookOpen },
            { label: "Active Days", value: uniqueDays || "—", icon: Calendar },
            { label: "Lab Sessions", value: labCount || "—", icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="glass-panel section-ring rounded-2xl">
              <CardContent className="flex items-center gap-3 p-5">
                <Icon className="size-5 text-slate-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-xs text-slate-400">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader>
            <CardTitle className="text-xl text-white">Assigned Classes</CardTitle>
            <p className="text-sm text-slate-400">
              {theoryCount} theory · {labCount} lab periods assigned by the scheduler.
            </p>
          </CardHeader>
          <CardContent>
            {myEntries.length > 0 ? (
              <div className="space-y-2">
                {myEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/4 p-4">
                    <div className="w-24 shrink-0">
                      <p className="font-semibold text-white text-sm">{entry.day}</p>
                      <p className="font-data text-xs uppercase text-slate-400">{entry.timeslotId}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{entry.courseName}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-400 mt-0.5">
                        <span className="rounded bg-white/10 px-2 py-0.5 text-slate-200 text-xs">{entry.roomName}</span>
                        <span>Section: {entry.sectionId.toUpperCase()}</span>
                      </div>
                    </div>
                    <StatusBadge tone={entry.type === "LAB" ? "active" : "healthy"}>
                      {entry.type}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <Calendar className="mx-auto size-12 text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-300">No classes assigned yet</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">
                  The admin hasn&apos;t generated the timetable yet. You&apos;ll see your classes here once it&apos;s done.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── ADMIN VIEW ────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch(`${API_BASE}/import/csv`, { method: "POST", body: formData })
      const data = await res.json() as CsvImportResult | { detail?: string }
      if (res.ok) {
        const summary = data as CsvImportResult
        setUploadSummary(summary)
        setPoolItems((prev) => [...prev, `[CSV] ${file.name} synced · ${summary.importedCount} rows · ${summary.constraintsApplied} AI rules`])
        aiService.getConstraintRules().then(setConstraintRules)
      } else {
        const errorMessage = "detail" in data ? data.detail : undefined
        alert(`Error: ${errorMessage || "Failed to upload"}`)
      }
    } catch {
      alert("Network Error uploading CSV")
    } finally {
      setIsUploading(false)
      e.target.value = ""
    }
  }

  const handleManualSubmit = async () => {
    const formData = new FormData()
    if (entryMode === "infrastructure") {
      if (roomName) formData.append("room_name", roomName)
      if (capacity) formData.append("capacity", capacity)
      if (targetBranch) formData.append("target_branch", targetBranch)
      if (sectionName) formData.append("section_name", sectionName)
      if (studentCount) formData.append("student_count", studentCount)
    } else {
      if (courseCode) formData.append("course_code", courseCode)
      if (courseName) formData.append("course_name", courseName)
      if (theoryHours) formData.append("theory_hours", theoryHours)
      if (facultyName) formData.append("faculty_name", facultyName)
      if (targetBranch) formData.append("target_branch", targetBranch)
      if (sectionName) formData.append("section_name", sectionName)
    }
    
    try {
      const res = await fetch(`${API_BASE}/import/manual`, { method: "POST", body: formData })
      const data = await res.json()
      if (res.ok) {
        setPoolItems((prev) => [...prev, data.message])
        setRoomName(""); setCapacity(""); setTargetBranch(""); setSectionName(""); setStudentCount("")
        setCourseCode(""); setCourseName(""); setTheoryHours(""); setFacultyName("")
      } else {
        alert(`Error: ${data.detail || "Failed"}`)
      }
    } catch {
      alert("Network Error submitting config")
    }
  }

  const isSuccess = jobStatus === "done" && solverResult?.status === "success"
  const isError = jobStatus === "error" || (jobStatus === "done" && solverResult?.status === "error")

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Command Center"
        title="Timetable Generator Setup"
        description="Upload your data, review the current setup, and generate the timetable."
        actions={
          <>
            <StatusBadge tone={isSuccess ? "healthy" : isError ? "critical" : "active"}>
              {isSuccess ? "Ready to Publish" : isError ? "Solve Failed" : "Draft Mode"}
            </StatusBadge>
            <Button
              variant="outline"
              className="rounded-2xl border-white/8 bg-white/5 text-slate-100"
              onClick={() => alert("Published to all users!")}
            >
              <GitBranch className="size-4" />
              Publish Master Schedule
            </Button>
            <div className="flex flex-col items-end gap-2">
              <Button
                className="rounded-2xl bg-amber-200 text-slate-950 hover:bg-amber-300 min-w-[220px]"
                onClick={startGenerate}
                disabled={isGenerating}
              >
                <WandSparkles className="size-4" />
                {isGenerating ? "Generating..." : "Generate Timetable"}
              </Button>
              <SolverProgressBar status={jobStatus} progress={progress} result={result} />
            </div>
          </>
        }
      />

      {/* Live Metrics Cards (update after generate) */}
      {(isSuccess || metrics.activeVersion.status === "ACTIVE") && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            {
              label: "Quality Score",
              value: `${qScore}`,
              sub: isSuccess ? "Current generation" : "Spring 2026 Active",
              icon: BarChart3,
              tone: "text-emerald-300",
              border: "border-emerald-500/20 bg-emerald-500/8",
            },
            {
              label: "Status",
              value: solverResult?.solver_status ?? "OPTIMAL",
              sub: isSuccess ? "Latest generation" : "Ready to run",
              icon: Cpu,
              tone: "text-blue-300",
              border: "border-blue-500/20 bg-blue-500/8",
            },
            {
              label: "Slots Filled",
              value: String(solverResult?.entries_generated ?? metrics.activeVersion.lockedSlots),
              sub: "Total timetable entries",
              icon: Layers,
              tone: "text-violet-300",
              border: "border-violet-500/20 bg-violet-500/8",
            },
            {
              label: "Generation Time",
              value: solverResult?.elapsed_ms ? `${solverResult.elapsed_ms}ms` : "< 30s",
              sub: "Most recent run",
              icon: Zap,
              tone: "text-amber-300",
              border: "border-amber-500/20 bg-amber-500/8",
            },
          ].map(({ label, value, sub, icon: Icon, tone, border }) => (
            <Card key={label} className={`rounded-2xl border ${border} ring-1 ring-white/5`}>
              <CardContent className="flex items-start gap-3 p-5">
                <Icon className={`mt-0.5 size-5 shrink-0 ${tone}`} />
                <div>
                  <p className={`text-xl font-bold ${tone}`}>{value}</p>
                  <p className="text-xs font-medium text-white">{label}</p>
                  <p className="text-xs text-slate-500">{sub}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <DashboardAiPanels />
        </div>

        {/* CSV Upload */}
        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader>
            <CardTitle className="text-xl text-white">Bulk Configuration Upload</CardTitle>
            <CardDescription className="text-slate-400">
               Upload CSV files for rooms, courses, faculty, or sections.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input type="file" className="hidden" ref={fileInputRef} accept=".csv" onChange={handleFileUpload} />
            <div
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/5 px-6 py-10 transition-colors hover:border-amber-200/50 hover:bg-white/10"
            >
              <div className="mb-3 rounded-full border border-white/35 bg-[rgba(255,255,255,0.01)] p-3 text-[#cbd5e1] group-hover:text-[#4f46e5]">
                <Upload className="size-6" />
              </div>
              <h3 className="font-semibold text-[#f8fafc]">{isUploading ? "Analyzing uploaded file..." : "Click to upload data"}</h3>
              <p className="mt-1 text-sm text-[#94a3b8]">Supported: room, course, faculty, section, and holiday CSV files.</p>
            </div>
            {uploadSummary && (
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1d4ed8]">AI constraint sync</p>
                    <p className="text-xs text-[#365b9b]">{uploadSummary.message}</p>
                  </div>
                  <StatusBadge tone="active">
                    {uploadSummary.constraintsApplied} rules
                  </StatusBadge>
                </div>
                <p className="mt-3 text-sm text-[#94a3b8]">
                  {uploadSummary.assistantNote || "The uploaded file has been folded into the scheduling ruleset."}
                </p>
                {uploadSummary.constraints.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {uploadSummary.constraints.slice(0, 4).map((rule) => (
                      <div key={rule.id} className="liquid-surface rounded-xl border border-white/40 bg-[rgba(255,255,255,0.01)] p-3">
                        <p className="text-sm font-medium text-[#f8fafc]">{formatConstraintRule(rule)}</p>
                        <p className="mt-1 text-xs text-[#94a3b8]">{rule.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {constraintRules.length > 0 && (
              <div className="rounded-2xl border border-white/40 bg-[rgba(255,255,255,0.01)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#f8fafc]">Active imported constraints</p>
                    <p className="text-xs text-[#94a3b8]">These rules will be applied during the next timetable generation.</p>
                  </div>
                  <StatusBadge tone="healthy">
                    {constraintRules.length} active
                  </StatusBadge>
                </div>
                <div className="mt-3 space-y-2">
                  {constraintRules.slice(0, 5).map((rule) => (
                    <div key={rule.id} className="liquid-surface rounded-xl border border-white/40 bg-[rgba(255,255,255,0.01)] p-3">
                      <p className="text-sm font-medium text-[#f8fafc]">{formatConstraintRule(rule)}</p>
                      <p className="mt-1 text-xs text-[#94a3b8]">{rule.sourceFile || "Uploaded data source"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {poolItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-slate-500">Injected Pool</p>
                {poolItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Input */}
        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-white">Manual entry</CardTitle>
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
                <button
                  onClick={() => setEntryMode("infrastructure")}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${entryMode === "infrastructure" ? "bg-white/10 text-white font-semibold" : "text-slate-400 hover:text-slate-300"}`}
                >
                  Rooms & Sections
                </button>
                <button
                  onClick={() => setEntryMode("course")}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${entryMode === "course" ? "bg-white/10 text-white font-semibold" : "text-slate-400 hover:text-slate-300"}`}
                >
                  Classes (Courses)
                </button>
              </div>
            </div>
            <CardDescription className="text-slate-400">
              {entryMode === "infrastructure" ? "Add rooms and sections directly." : "Add a course and assign it to a teacher and section."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {entryMode === "infrastructure" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Classroom Identifier</Label>
                      <Input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="e.g. A-101" className="border-white/10 bg-white/5 text-slate-100" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Student Capacity</Label>
                      <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="60" className="border-white/10 bg-white/5 text-slate-100" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Target Branch</Label>
                      <Input value={targetBranch} onChange={(e) => setTargetBranch(e.target.value)} placeholder="e.g. CSE" className="border-white/10 bg-white/5 text-slate-100" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Assigned Section</Label>
                      <Input value={sectionName} onChange={(e) => setSectionName(e.target.value)} placeholder="e.g. 5A" className="border-white/10 bg-white/5 text-slate-100" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Student Count</Label>
                      <Input type="number" value={studentCount} onChange={(e) => setStudentCount(e.target.value)} placeholder="54" className="border-white/10 bg-white/5 text-slate-100" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Course Code</Label>
                      <Input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="e.g. CS301" className="border-white/10 bg-white/5 text-slate-100" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Course Name</Label>
                      <Input value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="e.g. Algorithms" className="border-white/10 bg-white/5 text-slate-100" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Faculty Name</Label>
                      <Input value={facultyName} onChange={(e) => setFacultyName(e.target.value)} placeholder="e.g. Prof. Sara Joseph" className="border-white/10 bg-white/5 text-slate-100" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Theory Hours / Week</Label>
                      <Input type="number" value={theoryHours} onChange={(e) => setTheoryHours(e.target.value)} placeholder="3" className="border-white/10 bg-white/5 text-slate-100" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Target Branch</Label>
                      <Input value={targetBranch} onChange={(e) => setTargetBranch(e.target.value)} placeholder="e.g. CSE" className="border-white/10 bg-white/5 text-slate-100" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Target Section</Label>
                      <Input value={sectionName} onChange={(e) => setSectionName(e.target.value)} placeholder="e.g. cse-3a" className="border-white/10 bg-white/5 text-slate-100" />
                    </div>
                  </div>
                </>
              )}
              
              <Button onClick={handleManualSubmit} variant="secondary" className="w-full rounded-xl bg-white/10 text-white hover:bg-white/20">
                Add to Generation Pool
              </Button>
              {poolItems.length > 0 && (
                <div className="space-y-2 mt-4">
                  {poolItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
