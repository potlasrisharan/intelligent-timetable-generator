import { CalendarRange, ShieldCheck, Sparkles } from "lucide-react"
import { DataTableCard } from "@/components/shared/data-table-card"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { sectionService } from "@/lib/services/section-service"

export default async function HolidaysPage() {
  const holidays = await sectionService.getHolidays()

  const rows = holidays.map((holiday) => [
    <div key={`${holiday.id}-name`}>
      <p className="font-medium text-white">{holiday.name}</p>
      <p className="mt-1 text-sm text-slate-400">{holiday.scope}</p>
    </div>,
    <div key={`${holiday.id}-date`} className="text-slate-300">
      {holiday.date}
    </div>,
    <div key={`${holiday.id}-impact`} className="max-w-[340px] whitespace-normal text-slate-300">
      {holiday.impact}
    </div>,
    <StatusBadge key={`${holiday.id}-status`} tone="warning">
      blocked
    </StatusBadge>,
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuration / holidays"
        title="Academic blackout windows and calendar exceptions"
        description="Keep holiday blocks and calendar exceptions visible before updating the timetable."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Holiday blocks" value={String(holidays.length)} detail="Explicit blackout dates in the current semester." icon={CalendarRange} progress={57} />
        <MetricCard label="Protected from scheduling" value="100%" detail="Holiday dates are excluded from class placement." icon={ShieldCheck} progress={100} />
        <MetricCard label="Review prompt" value="Enabled" detail="Warnings appear when a new holiday invalidates a draft." icon={Sparkles} tone="amber" progress={85} />
      </div>

      <DataTableCard
        title="Holiday register"
        subtitle="Holiday name, date, impact, and current status."
        headers={["Holiday", "Date", "Impact", "Status"]}
        rows={rows}
      />
    </div>
  )
}
