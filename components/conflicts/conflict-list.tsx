"use client"

import { useState } from "react"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { scheduleService } from "@/lib/services/schedule-service"
import type { Conflict } from "@/lib/types"

export function ConflictList({ initialConflicts }: { initialConflicts: Conflict[] }) {
  const [conflicts, setConflicts] = useState(initialConflicts)
  const [resolving, setResolving] = useState<string | null>(null)

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
    } catch {
      alert("Failed to resolve conflict. Check network.")
    } finally {
      setResolving(null)
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
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {openConflicts.map((conflict) => (
        <Card key={conflict.id} className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl text-white">{conflict.title}</CardTitle>
                <p className="mt-2 text-sm leading-6 text-slate-300">{conflict.description}</p>
              </div>
              <StatusBadge tone={conflict.severity === "critical" ? "critical" : conflict.severity === "high" ? "warning" : "active"}>
                {conflict.severity}
              </StatusBadge>
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
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
