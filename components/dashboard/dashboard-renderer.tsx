"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, BookOpen, Calendar, Clock, GitBranch, GraduationCap, Upload, WandSparkles, Trash } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { MetricCard } from "@/components/shared/metric-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/lib/services/auth-service"
import type { DashboardMetrics, Course, Section, UserRole } from "@/lib/types"

// To manage dynamic generation state
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
  const [isGenerating, setIsGenerating] = useState(false)
  const [timetableGenerated, setTimetableGenerated] = useState(false)
  
  useEffect(() => {
    setRole(authService.getSession().user?.role || "ADMIN")
  }, [])

  if (!role) return null

  if (role === "STUDENT") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Student Portal"
          title="My Timetable"
          description="View your enrolled courses, upcoming classes, and assigned faculty."
          actions={
            <Button variant="outline" className="rounded-2xl border-white/8 bg-white/5 text-slate-100">
              <Calendar className="size-4" />
              Sync to Calendar
            </Button>
          }
        />
        
        {/* Crucial requested feature: Explicit Branch and Section Name */}
        <div className="flex flex-col gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center shadow-[0_0_40px_-10px_rgba(16,185,129,0.15)] ring-1 ring-white/5">
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Computer Science Engineering</h2>
          <p className="font-data text-sm uppercase tracking-[0.2em] text-emerald-300">Section: CSE 5A (Core Batch)</p>
        </div>

        <Card className="glass-panel section-ring mt-6 rounded-[1.5rem]">
          <CardHeader>
            <CardTitle className="text-xl text-white">Today&apos;s Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {timetableGenerated || metrics.activeVersion.status === "ACTIVE" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/4 p-4">
                  <div className="w-16 font-data text-xs text-slate-400">09:10<br/>10:50</div>
                  <div className="flex-1">
                    {/* Explicitly showing Subject, Faculty, Classroom */}
                    <h4 className="font-semibold text-white">Image Processing Lab</h4>
                    <p className="text-sm text-slate-400">Inst: Dr. Farhan Alam • Room: AI Lab</p>
                  </div>
                  <StatusBadge tone="active">Lab</StatusBadge>
                </div>
                <div className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/4 p-4">
                  <div className="w-16 font-data text-xs text-slate-400">11:40<br/>12:30</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white">Distributed Systems</h4>
                    <p className="text-sm text-slate-400">Inst: Prof. Sara Joseph • Room: A-101</p>
                  </div>
                  <StatusBadge tone="healthy">Theory</StatusBadge>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <Calendar className="mx-auto size-12 text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-300">Timetable Not Published Yet</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2">The administration is currently preparing the schedule. Check back later.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (role === "TEACHER") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Teacher Portal"
          title="My Schedule"
          description="Manage your availability and review assigned courses."
        />
        
        <Card className="glass-panel section-ring mt-6 rounded-[1.5rem]">
          <CardHeader>
            <CardTitle className="text-xl text-white">Assigned Classes</CardTitle>
          </CardHeader>
          <CardContent>
             {timetableGenerated || metrics.activeVersion.status === "ACTIVE" ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/4 p-5 md:flex-row md:items-center">
                  <div className="w-16 font-data text-xs text-slate-400">09:10<br/>10:50</div>
                  <div className="flex-1">
                    {/* Explicitly showing Subject, Classroom, Section */}
                    <h4 className="font-semibold text-white">Web Application Development Lab</h4>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                      <span className="rounded bg-white/10 px-2 py-0.5 text-slate-200">Room: B115</span>
                      <span>Target: CSE 3A (AIML Block)</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-data text-xs text-amber-200">2 HOURS</p>
                  </div>
                </div>
              </div>
             ) : (
              <div className="py-12 text-center">
                <Calendar className="mx-auto size-12 text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-300">Timetable Not Published Yet</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2">The administration is currently running the timetable generator.</p>
              </div>
             )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // DEFAULT (ADMIN)
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Command Center"
        title="Timetable Generator Setup"
        description="Configure infrastructure, upload constraints, and generate optimized schedules."
        actions={
          <>
            <StatusBadge tone={timetableGenerated ? "healthy" : "active"}>{timetableGenerated ? "Ready to Publish" : "Draft Mode"}</StatusBadge>
            <Button variant="outline" className="rounded-2xl border-white/8 bg-white/5 text-slate-100" onClick={() => alert("Published to all users!")}>
              <GitBranch className="size-4" />
              Publish Master Schedule
            </Button>
            <Button 
              className="rounded-2xl bg-amber-200 text-slate-950 hover:bg-amber-300"
              onClick={() => {
                setIsGenerating(true)
                setTimeout(() => {
                  setIsGenerating(false)
                  setTimetableGenerated(true)
                }, 2000)
              }}
              disabled={isGenerating}
            >
              <WandSparkles className="size-4" />
              {isGenerating ? "Executing OR-Tools..." : "Generate Timetable"}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader>
            <CardTitle className="text-xl text-white">Bulk Configuration Upload</CardTitle>
            <CardDescription className="text-slate-400">Upload CSV files containing subjects, faculty mapping, and section targets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/5 px-6 py-10 transition-colors hover:border-amber-200/50 hover:bg-white/10">
                <div className="rounded-full bg-white/10 p-3 mb-3 text-slate-300 group-hover:text-amber-200">
                  <Upload className="size-6" />
                </div>
                <h3 className="font-semibold text-white">Drag and drop your dataset</h3>
                <p className="mt-1 text-sm text-slate-400">Supports .csv arrays for Curriculum and Faculty Mappings</p>
             </div>
          </CardContent>
        </Card>

        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader>
            <CardTitle className="text-xl text-white">Manual Capacity Input</CardTitle>
            <CardDescription className="text-slate-400">Explicitly define classrooms and section branch details.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Classroom Identifier</Label>
                  <Input placeholder="e.g. A-101" className="border-white/10 bg-white/5" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Student Capacity</Label>
                  <Input type="number" placeholder="60" className="border-white/10 bg-white/5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Target Branch</Label>
                  <Input placeholder="e.g. CSE" className="border-white/10 bg-white/5" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Assigned Section</Label>
                  <Input placeholder="e.g. 5A" className="border-white/10 bg-white/5" />
                </div>
              </div>
              <Button variant="secondary" className="w-full rounded-xl bg-white/10 text-white hover:bg-white/20">
                Add to Generation Pool
              </Button>
            </div>
            
            <div className="mt-5 space-y-2">
              {["A-101 (Cap: 60) -> Targeted for CSE", "Lab 2 (Cap: 30) -> Targeted for ECE"].map((room, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl border border-white/5 bg-[rgba(0,0,0,0.2)] p-3 text-sm text-slate-300">
                  <span>{room}</span>
                  <button className="text-slate-500 hover:text-red-400"><Trash className="size-3.5" /></button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
