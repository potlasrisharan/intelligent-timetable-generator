"use client"

import { useState, useRef, useEffect } from "react"
import { Brain, ChevronRight, Cpu, FlaskConical, Lightbulb, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type XaiEntry = {
  entryId: string
  courseCode: string
  courseName: string
  slotLabel: string
  room: string
  facultyName: string
  type: string
  reason: string
}

type Props = {
  entry: XaiEntry | null
  onClose: () => void
}

const STEPS = [
  "Evaluating room availability…",
  "Checking faculty conflict table…",
  "Verifying section double-booking…",
  "Validating room capacity…",
  "Applying lab-type constraint…",
  "Computing soft-constraint penalty…",
  "Finalizing slot assignment.",
]

export function XaiPanel({ entry, onClose }: Props) {
  const [visibleSteps, setVisibleSteps] = useState(0)
  const prevEntry = useRef<string | null>(null)

  useEffect(() => {
    if (!entry) return
    if (prevEntry.current === entry.entryId) return
    prevEntry.current = entry.entryId
    setVisibleSteps(0)
    let i = 0
    const timer = setInterval(() => {
      i += 1
      setVisibleSteps(i)
      if (i >= STEPS.length) clearInterval(timer)
    }, 160)
    return () => clearInterval(timer)
  }, [entry])

  if (!entry) return null

  const isLab = entry.type === "LAB"

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 w-[420px] rounded-[1.5rem] border border-violet-500/30",
        "bg-[rgba(15,10,35,0.92)] shadow-[0_0_60px_-10px_rgba(139,92,246,0.4)]",
        "backdrop-blur-xl ring-1 ring-white/5",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-white/8 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
            <Brain className="size-4" />
          </div>
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-violet-400">
              XAI · Constraint Trace
            </p>
            <p className="mt-0.5 text-sm font-semibold text-white">{entry.courseCode} — {entry.slotLabel}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-0.5 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Meta row */}
      <div className="flex gap-3 border-b border-white/8 px-5 py-3">
        <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
          {isLab ? <FlaskConical className="mr-1 inline size-3 text-amber-300" /> : <Cpu className="mr-1 inline size-3 text-blue-400" />}
          {entry.type}
        </span>
        <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
          🏫 {entry.room}
        </span>
        <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
          👤 {entry.facultyName.split(" ").slice(-1)[0]}
        </span>
      </div>

      {/* Constraint trace steps */}
      <div className="space-y-0.5 px-5 py-4">
        <p className="mb-3 text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">Solver Constraint Trace</p>
        {STEPS.map((step, idx) => (
          <div
            key={idx}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition-all duration-300",
              idx < visibleSteps
                ? "bg-emerald-500/10 text-emerald-300"
                : "opacity-0",
            )}
          >
            <ChevronRight className="size-3 shrink-0 text-emerald-500" />
            <span className={cn("font-mono", idx < visibleSteps ? "opacity-100" : "opacity-0")}>
              {step}
            </span>
          </div>
        ))}
      </div>

      {/* Final reason */}
      {visibleSteps >= STEPS.length && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 border-t border-white/8 px-5 py-4">
          <div className="flex gap-3 rounded-[1.15rem] border border-violet-500/20 bg-violet-500/10 p-4">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-violet-300" />
            <p className="text-sm leading-[1.65] text-violet-100">{entry.reason}</p>
          </div>
        </div>
      )}
    </div>
  )
}
