"use client"

import { useEffect, useState } from "react"
import {
  BookOpen, Calendar, Clock,
  GraduationCap, BarChart3, Layers,
  CheckCircle2, AlertCircle,
} from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { authService } from "@/lib/services/auth-service"
import { scheduleService } from "@/lib/services/schedule-service"
import { facultyService } from "@/lib/services/faculty-service"
import type { TimetableEntry, Faculty } from "@/lib/types"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
const PERIODS = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"]
const PERIOD_LABELS: Record<string, string> = {
  p1: "8:30",
  p2: "9:30",
  p3: "10:35",
  p4: "11:35",
  p5: "13:20",
  p6: "14:20",
  p7: "15:25",
}

export function TeacherDashboardRenderer() {
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [myInfo, setMyInfo] = useState<Faculty | null>(null)
  const [userName, setUserName] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = authService.getSession()
    const user = session.user
    setUserName(user?.name ?? "")
    const fname = user?.facultyName ?? user?.name ?? ""

    Promise.all([
      scheduleService.getEditorEntries(),
      facultyService.getFaculty(),
    ]).then(([allEntries, allFaculty]) => {
      setEntries(allEntries.filter((e) => e.facultyName === fname))
      setMyInfo(allFaculty.find((f) => f.name === fname) ?? null)
      setLoading(false)
    })
  }, [])

  const totalClasses = entries.length
  const activeDays = new Set(entries.map((e) => e.day)).size
  const labCount = entries.filter((e) => e.type === "LAB").length
  const theoryCount = entries.filter((e) => e.type === "THEORY").length

  // Build weekly grid: day → period → entry
  const grid: Record<string, Record<string, TimetableEntry>> = {}
  for (const day of DAYS) grid[day] = {}
  for (const entry of entries) {
    if (grid[entry.day]) grid[entry.day][entry.timeslotId] = entry
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="glass-panel-strong rounded-2xl px-8 py-6 text-center">
          <GraduationCap className="mx-auto size-8 animate-pulse text-blue-300" />
          <p className="mt-3 text-sm text-slate-300">Loading your schedule…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Teacher Portal"
        title="My Teaching Schedule"
        description="Your assigned classes for the current timetable."
      />

      {/* Identity banner */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-blue-500/25 bg-blue-500/8 p-5 ring-1 ring-white/5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/15">
          <BookOpen className="size-6 text-blue-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white">{userName}</p>
          <p className="text-sm text-blue-300">
            {myInfo?.designation ?? "Faculty"} ·{" "}
            {myInfo?.availability ?? "See admin for availability"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={myInfo?.status === "balanced" ? "healthy" : myInfo?.status === "high_load" ? "warning" : "inactive"}>
            {myInfo?.status?.replace("_", " ") ?? "faculty"}
          </StatusBadge>
          <StatusBadge tone="active">
            {totalClasses} classes/week
          </StatusBadge>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Classes", value: totalClasses, icon: BookOpen, tone: "text-blue-300", bg: "border-blue-500/20 bg-blue-500/8" },
          { label: "Active Days", value: activeDays, icon: Calendar, tone: "text-emerald-300", bg: "border-emerald-500/20 bg-emerald-500/8" },
          { label: "Theory Periods", value: theoryCount, icon: BarChart3, tone: "text-violet-300", bg: "border-violet-500/20 bg-violet-500/8" },
          { label: "Lab Sessions", value: labCount, icon: Layers, tone: "text-amber-300", bg: "border-amber-500/20 bg-amber-500/8" },
        ].map(({ label, value, icon: Icon, tone, bg }) => (
          <Card key={label} className={`rounded-2xl border ${bg} ring-1 ring-white/5`}>
            <CardContent className="flex items-start gap-3 p-5">
              <Icon className={`mt-0.5 size-5 shrink-0 ${tone}`} />
              <div>
                <p className={`text-2xl font-bold ${tone}`}>{value || "—"}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weekly Timetable Grid */}
      <Card className="glass-panel section-ring rounded-[1.5rem]">
        <CardHeader>
          <CardTitle className="text-xl text-white">Weekly Timetable Grid</CardTitle>
          <p className="text-sm text-slate-400">
            {theoryCount} theory · {labCount} lab · Tap a slot to view details
          </p>
        </CardHeader>
        <CardContent>
          {totalClasses === 0 ? (
            <div className="py-16 text-center">
              <AlertCircle className="mx-auto size-12 text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-300">No classes assigned yet</h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">
                The admin hasn&apos;t generated the timetable yet. Check back shortly.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="py-2 pr-3 text-left font-data text-[0.68rem] uppercase tracking-[0.22em] text-slate-500 w-12">
                      Period
                    </th>
                    {DAYS.map((day) => (
                      <th key={day} className="py-2 px-2 text-center font-data text-[0.68rem] uppercase tracking-[0.22em] text-slate-500">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {PERIODS.map((period) => (
                    <tr key={period} className="group">
                      <td className="py-2 pr-3">
                        <p className="font-semibold text-xs text-slate-300 uppercase">{period.toUpperCase()}</p>
                        <p className="text-[0.65rem] text-slate-500">{PERIOD_LABELS[period]}</p>
                      </td>
                      {DAYS.map((day) => {
                        const entry = grid[day][period]
                        if (!entry) {
                          return (
                            <td key={day} className="py-1.5 px-1">
                              <div className="h-14 rounded-xl border border-white/5 bg-white/2" />
                            </td>
                          )
                        }
                        return (
                          <td key={day} className="py-1.5 px-1">
                            <div
                              className={`h-14 rounded-xl border p-2 ${
                                entry.type === "LAB"
                                  ? "border-amber-500/25 bg-amber-500/10"
                                  : "border-blue-500/25 bg-blue-500/10"
                              }`}
                            >
                              <p className="font-semibold text-xs text-white truncate">
                                {entry.courseCode}
                              </p>
                              <p className="text-[0.62rem] text-slate-400 truncate">
                                {entry.roomName}
                              </p>
                              <p className="text-[0.62rem] uppercase font-data text-slate-500">
                                {entry.type}
                              </p>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Class list */}
      {totalClasses > 0 && (
        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader>
            <CardTitle className="text-xl text-white">Class Details</CardTitle>
            <p className="text-sm text-slate-400">All assigned slots sorted by day and period</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {entries
                .sort((a, b) => {
                  const di = DAYS.indexOf(a.day) - DAYS.indexOf(b.day)
                  if (di !== 0) return di
                  return PERIODS.indexOf(a.timeslotId) - PERIODS.indexOf(b.timeslotId)
                })
                .map((entry) => (
                  <div key={entry.id} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/4 p-4">
                    <div className="w-20 shrink-0">
                      <p className="font-semibold text-white text-sm">{entry.day}</p>
                      <p className="font-data text-xs uppercase text-slate-400">{entry.timeslotId.toUpperCase()}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{entry.courseName}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-400 mt-0.5 flex-wrap">
                        <span className="rounded bg-white/10 px-2 py-0.5 text-slate-200 text-xs">{entry.roomName}</span>
                        <span className="text-slate-500">·</span>
                        <span>Section: {entry.sectionId.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {entry.locked && <CheckCircle2 className="size-4 text-emerald-400" />}
                      <StatusBadge tone={entry.type === "LAB" ? "warning" : "healthy"}>
                        {entry.type}
                      </StatusBadge>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workload note */}
      {myInfo && (
        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 size-5 shrink-0 text-blue-300" />
              <div>
                <p className="font-semibold text-white">Weekly Load Contract</p>
                <p className="mt-1 text-sm text-slate-400">
                  {myInfo.weeklyLoad} periods assigned · Max {myInfo.maxPeriodsPerDay} per day ·
                  Availability: {myInfo.availability}
                </p>
                <div className="mt-3 h-2 w-full rounded-full bg-white/8">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-violet-400"
                    style={{ width: `${Math.min((myInfo.weeklyLoad / 20) * 100, 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500 font-data uppercase tracking-widest">
                  {myInfo.weeklyLoad} / 20 max periods
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
