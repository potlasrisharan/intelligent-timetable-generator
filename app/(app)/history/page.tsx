import { Clock3, RotateCcw, ShieldCheck } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { reportService } from "@/lib/services/report-service"
import { scheduleService } from "@/lib/services/schedule-service"

export default async function HistoryPage() {
  const versions = await scheduleService.getVersions()
  const auditTrail = await reportService.getAuditTrail()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights / history"
        title="Timetable version history and restore posture"
        description="Track draft, active, and archived states while keeping restore-ready metadata visible for admins and judges."
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-white">Version timeline</CardTitle>
            <p className="text-sm text-slate-400">
              Only one version can remain active, while older states stay recoverable.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {versions.map((version) => (
              <div key={version.id} className="rounded-[1.2rem] border border-white/8 bg-white/4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-data text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">{version.generatedAt}</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{version.label}</h3>
                  </div>
                  <StatusBadge tone={version.status === "ACTIVE" ? "healthy" : version.status === "DRAFT" ? "active" : "inactive"}>
                    {version.status}
                  </StatusBadge>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
                  <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1">Quality {version.qualityScore}</span>
                  <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1">{version.lockedSlots} locked slots</span>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-400">{version.notes}</p>
                <div className="mt-5 flex gap-3">
                  <Button variant="outline" className="rounded-2xl border-white/8 bg-white/5 text-slate-100">
                    <Clock3 className="size-4" />
                    Inspect snapshot
                  </Button>
                  <Button className="rounded-2xl">
                    <RotateCcw className="size-4" />
                    Restore version
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-white">Audit notes</CardTitle>
            <p className="text-sm text-slate-400">
              Immutable activity trail for publish, regenerate, and staffing edits.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {auditTrail.map((event) => (
              <div key={event.id} className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{event.action}</p>
                  <StatusBadge tone={event.tone === "success" ? "healthy" : event.tone === "warning" ? "warning" : "active"}>
                    {event.timestamp}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-sm text-slate-300">{event.actor}</p>
                <p className="mt-1 text-sm text-slate-500">{event.target}</p>
              </div>
            ))}
            <div className="rounded-[1.15rem] border border-emerald-400/16 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
              <ShieldCheck className="mb-3 size-4" />
              Restore operations are represented in the UI now and can later connect straight to the version-restore backend endpoint.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
