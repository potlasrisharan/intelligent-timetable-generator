import { AlertTriangle, Sparkles } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { scheduleService } from "@/lib/services/schedule-service"

export default async function ConflictsPage() {
  const conflicts = await scheduleService.getConflicts()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Scheduling / conflicts"
        title="Conflict resolution center"
        description="Readable rule violations, ranked remediation options, and explicit quality impact blocks for quick dean-facing decisions."
        actions={
          <>
            <StatusBadge tone="warning">{conflicts.length} open items</StatusBadge>
            <Button className="rounded-2xl">
              <Sparkles className="size-4" />
              Suggest best fixes
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.22fr_0.78fr]">
        <div className="space-y-5">
          {conflicts.map((conflict) => (
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
                <div className="space-y-3">
                  {conflict.suggestedFixes.map((fix) => (
                    <div key={fix} className="rounded-[1.2rem] border border-slate-300/14 bg-slate-300/8 p-4">
                      <p className="text-sm font-medium text-white">{fix}</p>
                    </div>
                  ))}
                  <div className="rounded-[1.2rem] border border-amber-300/16 bg-amber-300/10 p-4">
                    <p className="text-sm font-medium text-amber-100">
                      Estimated quality impact: {conflict.qualityImpact} points
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-white">Resolution protocol</CardTitle>
            <p className="text-sm text-slate-400">
              The UI mirrors how FastAPI and the solver will frame remediation choices.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-slate-300">
            <div className="rounded-[1.15rem] border border-rose-400/16 bg-rose-400/10 p-4">
              <AlertTriangle className="mb-3 size-4 text-rose-200" />
              Hard-constraint violations stay blocked until a legal alternative is applied.
            </div>
            <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
              Soft-constraint changes are allowed, but the page keeps quality deltas visible before publish.
            </div>
            <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
              Suggested fixes are intentionally ranked for the fastest live-demo path.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
