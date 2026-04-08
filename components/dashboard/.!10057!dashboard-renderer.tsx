"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import {
  BookOpen, Calendar, CheckCircle2, Clock,
  Cpu, GitBranch, Upload, WandSparkles, Zap,
  Brain, BarChart3, Layers, GraduationCap,
} from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/lib/services/auth-service"
import type { DashboardMetrics, Course, Section, UserRole, TimetableEntry } from "@/lib/types"
import { envConfig } from "@/lib/config"
import { scheduleService } from "@/lib/services/schedule-service"

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
    progress < 15 ? "Initialising solver…" :
    progress < 30 ? "Loading constraints…" :
    progress < 50 ? "Building CP-SAT model…" :
    progress < 70 ? "OR-Tools solving…" :
    progress < 90 ? "Writing schedule back…" :
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

