"use client"

import { useEffect, useState, useRef } from "react"
import { AlertTriangle, BookOpen, Calendar, Clock, GitBranch, GraduationCap, Upload, WandSparkles, Trash } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/lib/services/auth-service"
import type { DashboardMetrics, Course, Section, UserRole } from "@/lib/types"

const API_BASE = "http://localhost:8000/api/v1"

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
  
  // Generative State
  const [isGenerating, setIsGenerating] = useState(false)
  const [timetableGenerated, setTimetableGenerated] = useState(false)
  const [generationMsg, setGenerationMsg] = useState("")

  // Form State
  const [roomName, setRoomName] = useState("")
  const [capacity, setCapacity] = useState("")
  const [targetBranch, setTargetBranch] = useState("")
  const [sectionName, setSectionName] = useState("")
  const [studentCount, setStudentCount] = useState("")
  
  // Pool display state
  const [poolItems, setPoolItems] = useState<string[]>([])
  
  // File upload logic
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    setRole(authService.getSession().user?.role || "ADMIN")
  }, [])

  if (!role) return null

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const formData = new FormData()
    formData.append("file", file)
    
    try {
      const res = await fetch(`${API_BASE}/import/csv`, { method: "POST", body: formData })
      const data = await res.json()
      if (res.ok) {
        alert(data.message)
        setPoolItems(prev => [...prev, `[CSV] ${file.name} injected.`])
      } else {
        alert(`Error: ${data.detail || 'Failed to upload'}`)
      }
    } catch (err) {
      alert("Network Error uploading CSV")
    }
  }

  const handleManualSubmit = async () => {
    const formData = new FormData()
    if (roomName) formData.append("room_name", roomName)
    if (capacity) formData.append("capacity", capacity)
    if (targetBranch) formData.append("target_branch", targetBranch)
    if (sectionName) formData.append("section_name", sectionName)
    if (studentCount) formData.append("student_count", studentCount)
    
    try {
      const res = await fetch(`${API_BASE}/import/manual`, { method: "POST", body: formData })
      const data = await res.json()
      if (res.ok) {
        setPoolItems(prev => [...prev, data.message])
        setRoomName(""); setCapacity(""); setTargetBranch(""); setSectionName(""); setStudentCount("");
      } else {
        alert(`Error: ${data.detail || 'Failed'}`)
      }
    } catch (err) {
      alert("Network Error submitting config")
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setGenerationMsg("Executing OR-Tools Logic...")
    try {
      const res = await fetch(`${API_BASE}/schedule/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "all", parameters: {} })
      })
      const data = await res.json()
      if (res.ok && data.status === "success") {
        setGenerationMsg(`Success! Score: ${data.quality_score}`)
        setTimetableGenerated(true)
      } else {
        setGenerationMsg(`Conflict: ${data.message}`)
      }
    } catch (err) {
      setGenerationMsg("Network Error contacting Engine.")
    } finally {
      setIsGenerating(false)
    }
  }


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
        <PageHeader eyebrow="Teacher Portal" title="My Schedule" description="Manage your availability and review assigned courses." />
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
                    <h4 className="font-semibold text-white">Web Application Development Lab</h4>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                      <span className="rounded bg-white/10 px-2 py-0.5 text-slate-200">Room: B115</span>
                      <span>Target: CSE 3A (AIML Block)</span>
                    </div>
                  </div>
                </div>
              </div>
             ) : (
              <div className="py-12 text-center">
                <Calendar className="mx-auto size-12 text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-300">Timetable Not Published Yet</h3>
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
            <div className="flex flex-col gap-1 items-end">
                <Button 
                className="rounded-2xl bg-amber-200 text-slate-950 hover:bg-amber-300 min-w-[200px]"
                onClick={handleGenerate}
                disabled={isGenerating}
                >
                <WandSparkles className="size-4" />
                {isGenerating ? "Executing OR-Tools..." : "Generate Timetable"}
                </Button>
                {generationMsg && <span className="text-xs text-amber-200 font-data">{generationMsg}</span>}
            </div>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader>
            <CardTitle className="text-xl text-white">Bulk Configuration Upload</CardTitle>
            <CardDescription className="text-slate-400">Upload CSV files containing subjects, faculty mapping, and section targets. (Needs capacity, theory_hours, etc headers)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <input type="file" className="hidden" ref={fileInputRef} accept=".csv" onChange={handleFileUpload} />
             <div 
               onClick={() => fileInputRef.current?.click()}
               className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/5 px-6 py-10 transition-colors hover:border-amber-200/50 hover:bg-white/10"
             >
                <div className="rounded-full bg-white/10 p-3 mb-3 text-slate-300 group-hover:text-amber-200">
                  <Upload className="size-6" />
                </div>
                <h3 className="font-semibold text-white">Click to Upload Real Dataset</h3>
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
              <Button onClick={handleManualSubmit} variant="secondary" className="w-full rounded-xl bg-white/10 text-white hover:bg-white/20">
                Add to Generation Pool
              </Button>
            </div>
            
            {(poolItems.length > 0) && (
              <div className="mt-5 space-y-2">
                <p className="text-xs font-semibold uppercase text-slate-500 mb-2 mt-4">Injected Pool</p>
                {poolItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
