"use client"

import { useEffect, useState } from "react"
import {
  GraduationCap, Calendar, Clock,
  BookOpen, AlertCircle, Sun, Layers,
} from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { authService } from "@/lib/services/auth-service"
import { scheduleService } from "@/lib/services/schedule-service"
import { sectionService } from "@/lib/services/section-service"
import type { TimetableEntry, Section, Timeslot } from "@/lib/types"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]

function getTodayLabel(): string {
  const day = new Date().getDay() // 0=Sun, 1=Mon,...
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day] ?? "Mon"
}

export function StudentDashboardRenderer() {
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [mySection, setMySection] = useState<Section | null>(null)
  const [timeslots, setTimeslots] = useState<Timeslot[]>([])
  const [userName, setUserName] = useState("")
  const [sectionId, setSectionId] = useState("cse-3a")
  const [loading, setLoading] = useState(true)

  const today = getTodayLabel()

  useEffect(() => {
    const session = authService.getSession()
    const user = session.user
    setUserName(user?.name ?? "")
    const sid = user?.sectionId ?? "cse-3a"
    setSectionId(sid)

    Promise.all([
      scheduleService.getEditorEntries(),
      sectionService.getSections(),
      sectionService.getTimeslots(),
    ]).then(([allEntries, allSections, slots]) => {
      const myEntries = allEntries
        .filter((e) => e.sectionId === sid)
        .sort((a, b) => {
          const di = DAYS.indexOf(a.day) - DAYS.indexOf(b.day)
          if (di !== 0) return di
          return a.timeslotId.localeCompare(b.timeslotId)
        })
      setEntries(myEntries)
      setMySection(allSections.find((s) => s.id === sid) ?? null)
      setTimeslots(slots.filter((s) => !s.isLunch))
      setLoading(false)
    })
  }, [])

  const todayEntries = entries.filter((e) => e.day === today)
  const totalClasses = entries.length
  const labCount = entries.filter((e) => e.type === "LAB").length

  const getTimeslotLabel = (id: string) => {
    const ts = timeslots.find((t) => t.id === id)
    return ts ? `${ts.start}–${ts.end}` : id.toUpperCase()
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="glass-panel-strong rounded-2xl px-8 py-6 text-center">
          <GraduationCap className="mx-auto size-8 animate-pulse text-emerald-300" />
          <p className="mt-3 text-sm text-slate-300">Loading your timetable…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student Portal"
        title="My Class Schedule"
        description="Your personal timetable for the semester. Contact your advisor if any class looks incorrect."
      />

      {/* Identity banner */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-5 ring-1 ring-white/5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/15">
          <GraduationCap className="size-6 text-emerald-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white">{userName}</p>
          <p className="text-sm text-emerald-300">
            {mySection?.name ?? sectionId.toUpperCase()} · Semester {mySection?.semester ?? "—"} ·
            Advisor: {mySection?.advisor ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="healthy">{totalClasses} classes/week</StatusBadge>
          {mySection && (
            <StatusBadge tone={mySection.compactness >= 85 ? "healthy" : "warning"}>
              {mySection.compactness}% compact
            </StatusBadge>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Weekly Classes",
            value: totalClasses,
            icon: BookOpen,
            tone: "text-emerald-300",
            bg: "border-emerald-500/20 bg-emerald-500/8",
          },
          {
            label: "Today&apos;s Classes",
            value: todayEntries.length,
            icon: Sun,
            tone: "text-amber-300",
            bg: "border-amber-500/20 bg-amber-500/8",
          },
          {
            label: "Lab Sessions",
            value: labCount,
            icon: Layers,
            tone: "text-violet-300",
            bg: "border-violet-500/20 bg-violet-500/8",
          },
          {
            label: "Active Days",
            value: new Set(entries.map((e) => e.day)).size,
            icon: Calendar,
            tone: "text-blue-300",
            bg: "border-blue-500/20 bg-blue-500/8",
          },
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

      {/* Today's classes highlight */}
      {todayEntries.length > 0 && (
        <Card className="glass-panel section-ring rounded-[1.5rem] border-amber-500/15">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sun className="size-5 text-amber-300" />
              <CardTitle className="text-xl text-white">Today ({today})</CardTitle>
            </div>
            <p className="text-sm text-slate-400">{todayEntries.length} classes scheduled for today</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 rounded-2xl border border-amber-500/15 bg-amber-500/8 p-4"
                >
                  <div className="w-24 shrink-0">
                    <p className="font-semibold text-amber-200 text-sm">{getTimeslotLabel(entry.timeslotId)}</p>
                    <p className="font-data text-xs uppercase text-amber-300/60">{entry.timeslotId.toUpperCase()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{entry.courseName}</p>
                    <p className="text-sm text-slate-400 truncate">
                      {entry.facultyName} · Room: {entry.roomName}
                    </p>
                  </div>
                  <StatusBadge tone={entry.type === "LAB" ? "warning" : "healthy"}>
                    {entry.type}
                  </StatusBadge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full weekly schedule grouped by day */}
      <Card className="glass-panel section-ring rounded-[1.5rem]">
        <CardHeader>
          <CardTitle className="text-xl text-white">Full Weekly Schedule</CardTitle>
          <p className="text-sm text-slate-400">
            All classes for {mySection?.name ?? sectionId.toUpperCase()} — {totalClasses} slots total
          </p>
        </CardHeader>
        <CardContent>
          {totalClasses === 0 ? (
            <div className="py-16 text-center">
              <AlertCircle className="mx-auto size-12 text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-300">Timetable Not Published Yet</h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">
                The admin needs to generate and publish the schedule first. Check back soon.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {DAYS.map((day) => {
                const dayEntries = entries.filter((e) => e.day === day)
                if (dayEntries.length === 0) return null
                return (
                  <div key={day}>
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold font-data uppercase tracking-widest ${
                          day === today
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-white/8 text-slate-400 border border-white/8"
                        }`}
                      >
                        {day}
                        {day === today && " · Today"}
                      </div>
                      <div className="h-px flex-1 bg-white/8" />
                      <span className="text-xs text-slate-500">{dayEntries.length} class{dayEntries.length !== 1 ? "es" : ""}</span>
                    </div>
                    <div className="space-y-2 pl-1">
                      {dayEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/4 p-4"
                        >
                          <div className="w-24 shrink-0">
                            <Clock className="inline size-3 text-slate-500 mb-0.5 mr-1" />
                            <p className="font-data text-xs text-slate-400 inline">{getTimeslotLabel(entry.timeslotId)}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white truncate">{entry.courseName}</p>
                            <p className="text-sm text-slate-400 truncate">
                              {entry.facultyName} · {entry.roomName}
                            </p>
                          </div>
                          <StatusBadge tone={entry.type === "LAB" ? "warning" : "healthy"}>
                            {entry.type}
                          </StatusBadge>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
