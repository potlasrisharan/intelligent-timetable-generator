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
        "glass-panel section-ring fixed bottom-6 right-6 z-50 w-[420px] rounded-[1.5rem] border border-white/50",
        "shadow-[0_24px_80px_-26px_rgba(103,132,191,0.34)]",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-white/8 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/40 bg-[rgba(124,112,255,0.18)] text-[#4c5ed7]">
            <Brain className="size-4" />
          </div>
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#5b6fc6]">
              Placement details
            </p>
            <p className="mt-0.5 text-sm font-semibold text-[#f8fafc]">{entry.courseCode} - {entry.slotLabel}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-0.5 rounded-full border border-white/35 bg-[rgba(255,255,255,0.01)] p-1.5 text-[#94a3b8] transition-colors hover:bg-[rgba(255,255,255,0.03)] hover:text-[#f8fafc]"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Meta row */}
      <div className="flex gap-3 border-b border-white/8 px-5 py-3">
        <span className="rounded-full border border-white/40 bg-[rgba(255,255,255,0.01)] px-2.5 py-1 text-xs text-[#cbd5e1]">
          {isLab ? <FlaskConical className="mr-1 inline size-3 text-[#b7791f]" /> : <Cpu className="mr-1 inline size-3 text-[#2563eb]" />}
          {entry.type}
        </span>
        <span className="rounded-full border border-white/40 bg-[rgba(255,255,255,0.01)] px-2.5 py-1 text-xs text-[#cbd5e1]">
          Room: {entry.room}
        </span>
        <span className="rounded-full border border-white/40 bg-[rgba(255,255,255,0.01)] px-2.5 py-1 text-xs text-[#cbd5e1]">
          Faculty: {entry.facultyName}
        </span>
      </div>

      {/* Constraint trace steps */}
      <div className="space-y-0.5 px-5 py-4">
        <p className="mb-3 text-[0.7rem] uppercase tracking-[0.2em] text-[#94a3b8]">Placement checks</p>
        {STEPS.map((step, idx) => (
          <div
            key={idx}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition-all duration-300",
              idx < visibleSteps
                ? "border border-emerald-400/25 bg-emerald-400/10 text-[#166534]"
                : "opacity-0",
            )}
          >
            <ChevronRight className="size-3 shrink-0 text-[#16a34a]" />
            <span className={cn("font-mono", idx < visibleSteps ? "opacity-100" : "opacity-0")}>
              {step}
            </span>
          </div>
        ))}
      </div>

      {/* Final reason */}
      {visibleSteps >= STEPS.length && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 border-t border-white/8 px-5 py-4">
          <div className="flex gap-3 rounded-[1.15rem] border border-[#9baaf4]/35 bg-[rgba(149,160,255,0.16)] p-4">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-[#5566d5]" />
            <p className="text-sm leading-[1.65] text-[#94a3b8]">{entry.reason}</p>
          </div>
        </div>
      )}
    </div>
  )
}
