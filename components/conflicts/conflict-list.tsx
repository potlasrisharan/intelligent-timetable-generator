"use client"

import { useState } from "react"
import { toast } from "sonner"
import { WandSparkles } from "lucide-react"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { aiService } from "@/lib/services/ai-service"
import { scheduleService } from "@/lib/services/schedule-service"
import type { AutoRescheduleResult, Conflict } from "@/lib/types"

export function ConflictList({ initialConflicts }: { initialConflicts: Conflict[] }) {
  const [conflicts, setConflicts] = useState(initialConflicts)
  const [resolving, setResolving] = useState<string | null>(null)
  const [aiResolving, setAiResolving] = useState<string | null>(null)
  const [aiResults, setAiResults] = useState<Record<string, AutoRescheduleResult>>({})
  const [lastAiAction, setLastAiAction] = useState<string | null>(null)

  const handleResolve = async (conflictId: string, fix: string) => {
    setResolving(conflictId)
    try {
      await scheduleService.resolveConflict(conflictId, fix)
      // Update local state to mark as resolved
      setConflicts((prev) =>
        prev.map((c) =>
          c.id === conflictId ? { ...c, status: "resolved" } : c
        )
      )
      toast.success("Conflict resolved", { description: `Applied fix: ${fix}` })
    } catch {
      toast.error("Resolution failed", { description: "Could not apply fix. Check your network connection." })
    } finally {
      setResolving(null)
    }
  }

  const handleAiResolve = async (conflictId: string) => {
    setAiResolving(conflictId)
    try {
      const result = await aiService.autoReschedule(conflictId)
      setAiResults((current) => ({ ...current, [conflictId]: result }))
      if (result.applied) {
        setLastAiAction(result.summary)
        setConflicts((prev) =>
          prev.map((conflict) =>
            conflict.id === conflictId ? { ...conflict, status: "resolved" } : conflict,
          ),
        )
        toast.success("AI resolved conflict", { description: result.summary })
      } else {
        toast.info("AI analysis complete", { description: result.summary })
      }
    } catch {
      setAiResults((current) => ({
        ...current,
        [conflictId]: {
          ok: true,
          applied: false,
          conflictId,
          resolution: "",
          summary: "AI could not apply a safe reschedule right now.",
          changes: [],
        },
      }))
    } finally {
      setAiResolving(null)
    }
  }

  const openConflicts = conflicts.filter((c) => c.status !== "resolved")

  if (openConflicts.length === 0) {
    return (
      <Card className="glass-panel section-ring rounded-[1.5rem] mt-6">
        <CardContent className="py-16 text-center space-y-4">
          <div className="mx-auto size-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <span className="text-2xl">🎉</span>
          </div>
          <h3 className="text-xl font-semibold text-white">All Clear</h3>
          <p className="text-slate-400 max-w-sm mx-auto">
            You&apos;ve successfully resolved all scheduling conflicts. The timetable is ready to be published!
          </p>
          {lastAiAction ? (
            <div className="mx-auto max-w-md rounded-[1.15rem] border border-emerald-400/18 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
              <WandSparkles className="mr-2 inline size-4" />
              {lastAiAction}
            </div>
          ) : null}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {lastAiAction ? (
        <div className="rounded-[1.25rem] border border-emerald-400/18 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
          <WandSparkles className="mr-2 inline size-4" />
          {lastAiAction}
        </div>
      ) : null}
      {openConflicts.map((conflict) => (
        <Card key={conflict.id} className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl text-white">{conflict.title}</CardTitle>
                <p className="mt-2 text-sm leading-6 text-slate-300">{conflict.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge tone={conflict.severity === "critical" ? "critical" : conflict.severity === "high" ? "warning" : "active"}>
                  {conflict.severity}
                </StatusBadge>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-violet-500/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
                  onClick={() => void handleAiResolve(conflict.id)}
                  disabled={aiResolving === conflict.id}
                >
                  <WandSparkles className="size-4" />
                  {aiResolving === conflict.id ? "Rescheduling..." : "AI auto-reschedule"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-[1.2rem] border border-white/8 bg-white/4 p-4">
              <p className="font-data text-[0.7rem] uppercase tracking-[0.24em] text-slate-500">
                Rule code
              </p>
              <p className="mt-3 text-lg font-semibold text-white">{conflict.ruleCode}</p>
              <div className="mt-4 space-y-2">
                {conflict.affected.map((item) => (
                  <div key={item} className="rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-sm text-slate-300">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3 flex flex-col">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">Remediation Options</p>
              {conflict.suggestedFixes.map((fix) => (
                <div key={fix} className="group flex items-center justify-between rounded-[1.2rem] border border-slate-300/14 bg-slate-300/8 p-4 transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/10">
                  <p className="text-sm font-medium text-white group-hover:text-emerald-100">{fix}</p>
                  <Button
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-8"
                    onClick={() => handleResolve(conflict.id, fix)}
                    disabled={resolving === conflict.id}
                  >
                    {resolving === conflict.id ? "Applying…" : "Apply fix"}
                  </Button>
                </div>
              ))}
              <div className="mt-auto pt-2">
                <div className="rounded-[1.2rem] border border-amber-300/16 bg-amber-300/10 p-4">
                  <p className="text-sm font-medium text-amber-100">
                    Estimated quality impact: {conflict.qualityImpact} points
                  </p>
                </div>
              </div>
              {aiResults[conflict.id] ? (
                <div
                  className={`rounded-[1.2rem] border p-4 text-sm leading-6 ${
                    aiResults[conflict.id].applied
                      ? "border-emerald-400/18 bg-emerald-400/10 text-emerald-100"
                      : "border-violet-500/18 bg-violet-500/10 text-violet-100"
                  }`}
                >
                  <p className="font-medium">{aiResults[conflict.id].summary}</p>
                  {aiResults[conflict.id].assistantNote ? (
                    <p className="mt-2">{aiResults[conflict.id].assistantNote}</p>
                  ) : null}
                  {aiResults[conflict.id].changes.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {aiResults[conflict.id].changes.map((change) => (
                        <div key={change.entryId} className="liquid-surface rounded-xl border border-white/40 bg-[rgba(255,255,255,0.01)] px-3 py-2">
                          <p className="font-medium text-[#f8fafc]">{change.courseCode}</p>
                          <p className="mt-1 text-xs text-[#94a3b8]">
                            {change.fromLabel} {"->"} {change.toLabel}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
