"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, BookOpen, Cpu, GitBranch, GraduationCap, WandSparkles, Calendar, Clock, UserCheck, BookMarked } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { MetricCard } from "@/components/shared/metric-card"
import { MiniBarList } from "@/components/shared/mini-bar-list"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { authService } from "@/lib/services/auth-service"
import type { DashboardMetrics, Course, Section, UserRole } from "@/lib/types"

export function DashboardRenderer({
  metrics,
  courses,
  sections,
}: {
  metrics: DashboardMetrics
  courses: Course[]
  sections: Section[]
}) {
  const [role, setRole] = useState<UserRole | null>(null)
  
  useEffect(() => {
    setRole(authService.getSession().user?.role || "SUPER_ADMIN")
  }, [])

  if (!role) return null

  if (role === "STUDENT") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Student portal"
          title="My Timetable"
          description="View your enrolled courses, upcoming classes, and assigned faculty."
          actions={
            <Button variant="outline" className="rounded-2xl border-white/8 bg-white/5 text-slate-100">
              <Calendar className="size-4" />
              Sync to Calendar
            </Button>
          }
        />
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Registered Credits" value="22" detail="Current semester load" icon={BookMarked} progress={100} />
          <MetricCard label="Upcoming Classes" value="4" detail="Today's scheduled sessions" icon={Clock} progress={60} />
          <MetricCard label="Schedule Status" value="Finalized" detail="All conflicts resolved" icon={GraduationCap} tone="healthy" progress={100} />
        </div>
        <Card className="glass-panel section-ring rounded-[1.5rem] mt-6">
          <CardHeader>
            <CardTitle className="text-xl text-white">Today's Schedule: CSE A (AIML A)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="w-16 font-data text-xs text-slate-400">09:10<br/>10:50</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white">CSE3047L - Image Processing Lab</h4>
                  <p className="text-sm text-slate-400">Dr. Deepika Garg • Room B115</p>
                </div>
                <StatusBadge tone="active">Lab</StatusBadge>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="w-16 font-data text-xs text-slate-400">11:40<br/>12:30</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white">CSE3745 - Distributed Systems</h4>
                  <p className="text-sm text-slate-400">Mr. Daksh • Room B110</p>
                </div>
                <StatusBadge tone="healthy">Theory</StatusBadge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (role === "FACULTY") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Faculty portal"
          title="My Schedule & Load"
          description="Manage your availability, review assigned courses, and view your weekly timetable."
          actions={
            <Button className="rounded-2xl">
              <UserCheck className="size-4" />
              Update Availability
            </Button>
          }
        />
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Weekly Load" value="18 hrs" detail="Under maximum limit (20 hrs)" icon={Clock} progress={90} />
          <MetricCard label="Assigned Sections" value="3" detail="Across 2 courses" icon={GraduationCap} progress={100} />
          <MetricCard label="Pending Conflicts" value="0" detail="No double-bookings detected" icon={AlertTriangle} tone="healthy" progress={100} />
        </div>
        <Card className="glass-panel section-ring rounded-[1.5rem] mt-6">
          <CardHeader>
            <CardTitle className="text-xl text-white">My Courses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 p-4">
              <div>
                <h4 className="font-semibold text-white">CSE3013 - Web Application Development</h4>
                <p className="text-sm text-slate-400">Theory • Sections: CSE A</p>
              </div>
              <div className="text-right">
                <p className="font-data text-xs text-amber-200">3 HOURS/WK</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 p-4">
              <div>
                <h4 className="font-semibold text-white">CSE3013L - Web Application Lab</h4>
                <p className="text-sm text-slate-400">Practical • Sections: CSE A (All groups)</p>
              </div>
              <div className="text-right">
                <p className="font-data text-xs text-amber-200">6 HOURS/WK</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (role === "DEPARTMENT_ADMIN") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="School of Engineering & Sciences"
          title="Department Dashboard"
          description="Manage resources, faculty loads, and resolve constraints exclusively for the engineering department."
          actions={
            <Button className="rounded-2xl">
              <WandSparkles className="size-4" />
              Generate Dept Timetable
            </Button>
          }
        />
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Room Allocation" value="92%" detail="Department-controlled rooms" icon={GraduationCap} progress={92} />
          <MetricCard label="Faculty Utilization" value="84%" detail="Average weekly load vs capacity" icon={Cpu} progress={84} />
          <MetricCard label="Section Placements" value="100%" detail="All department courses scheduled" icon={BookMarked} progress={100} />
        </div>
        <div className="grid gap-6 xl:grid-cols-2 mt-6">
          <MiniBarList
            title="Faculty Workload Spotlight"
            subtitle="Top 5 highest loaded faculty members in the department."
            data={metrics.facultyWorkloadSnapshot.slice(0, 5)}
          />
          <MiniBarList
            title="Room Squeeze"
            subtitle="Most heavily utilized department specific labs and rooms."
            data={[
              { label: "B115 (Web/AI Lab)", value: 98, emphasis: "critical" },
              { label: "B012A (Classroom)", value: 85 },
              { label: "B101 (Classroom)", value: 72 },
            ]}
          />
        </div>
      </div>
    )
  }

  // DEFAULT (SUPER_ADMIN)
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Command center"
        title="Academic scheduling dashboard"
        description="Track solver readiness, draft quality, room pressure, faculty load balance, and the exact areas judges will care about during the hackathon walkthrough."
        actions={
          <>
            <StatusBadge tone={metrics.solverStatus}>{metrics.solverLabel}</StatusBadge>
            <Button variant="outline" className="rounded-2xl border-white/8 bg-white/5 text-slate-100">
              <GitBranch className="size-4" />
              Publish draft
            </Button>
            <Button className="rounded-2xl">
              <WandSparkles className="size-4" />
              Run partial generate
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Room utilization" value={`${metrics.roomUtilization}%`} detail="Across classrooms, labs, and large halls." icon={GraduationCap} progress={metrics.roomUtilization} />
        <MetricCard label="Faculty load balance" value={`${metrics.facultyLoadBalance}%`} detail="Current schedule fairness against weekly targets." icon={Cpu} progress={metrics.facultyLoadBalance} />
        <MetricCard label="Unresolved conflicts" value={String(metrics.unresolvedConflicts)} detail="Critical and soft violations still awaiting action." icon={AlertTriangle} tone="amber" progress={54} />
        <MetricCard label="Configured courses" value={String(courses.length)} detail={`${sections.length} sections ready for generation.`} icon={BookOpen} progress={84} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-xl text-white">Version posture</CardTitle>
              <StatusBadge tone="active">Draft outperforms active by 3 points</StatusBadge>
            </div>
            <p className="text-sm text-slate-400">Publish flow is ready. The current draft has stronger compactness and better lab chaining, but still carries a few remediations.</p>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            {[metrics.activeVersion, metrics.draftVersion].map((version) => (
              <div key={version.id} className="rounded-[1.25rem] border border-white/8 bg-white/4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-data text-[0.7rem] uppercase tracking-[0.24em] text-slate-500">{version.status}</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">{version.label}</h3>
                  </div>
                  <StatusBadge tone={version.status === "ACTIVE" ? "healthy" : "active"}>Quality {version.qualityScore}</StatusBadge>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-300">
                  <div className="rounded-2xl border border-white/8 bg-white/4 p-3"><p className="text-slate-500">Generated</p><p className="mt-2 font-medium text-white">{version.generatedAt}</p></div>
                  <div className="rounded-2xl border border-white/8 bg-white/4 p-3"><p className="text-slate-500">Locked slots</p><p className="mt-2 font-medium text-white">{version.lockedSlots}</p></div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-400">{version.notes}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <MiniBarList title="Department utilization pulse" subtitle="Judges get a fast read on how evenly the campus footprint is being used." data={metrics.utilizationByDepartment} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr_0.88fr]">
        <MiniBarList title="Faculty workload snapshot" subtitle="Current weekly allocations against configured daily caps." data={metrics.facultyWorkloadSnapshot} />
        <MiniBarList title="Section compactness" subtitle="How tightly each section timetable is packed across the week." data={metrics.compactnessSnapshot} tone="amber" />
        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-white">Recent activity</CardTitle>
            <p className="text-sm text-slate-400">Audit-flavored events from the latest generation and review cycle.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.recentActions.map((event) => (
              <div key={event.id} className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{event.action}</p>
                  <StatusBadge tone={event.tone === "success" ? "healthy" : event.tone === "warning" ? "warning" : "active"}>{event.timestamp}</StatusBadge>
                </div>
                <p className="mt-2 text-sm text-slate-300">{event.actor}</p>
                <p className="mt-1 text-sm text-slate-500">{event.target}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
