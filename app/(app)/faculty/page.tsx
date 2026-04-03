import { Clock3, ShieldCheck, Users } from "lucide-react"
import { DataTableCard } from "@/components/shared/data-table-card"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { facultyService } from "@/lib/services/faculty-service"

export default async function FacultyPage() {
  const faculty = await facultyService.getFaculty()

  const rows = faculty.map((member) => [
    <div key={`${member.id}-name`}>
      <p className="font-medium text-white">{member.name}</p>
      <p className="mt-1 text-sm text-slate-400">{member.designation}</p>
    </div>,
    <div key={`${member.id}-availability`} className="text-slate-300">
      {member.availability}
    </div>,
    <div key={`${member.id}-load`} className="text-slate-300">
      {member.weeklyLoad} / {member.maxPeriodsPerDay} max per day
    </div>,
    <div key={`${member.id}-preferences`} className="text-slate-300">
      {member.preferences.join(", ")}
    </div>,
    <StatusBadge key={`${member.id}-status`} tone={member.status === "balanced" ? "healthy" : member.status === "high_load" ? "warning" : "inactive"}>
      {member.status.replace("_", " ")}
    </StatusBadge>,
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuration / faculty"
        title="Faculty availability and workload control"
        description="Balance daily teaching limits, respect availability windows, and surface overloads before the solver locks them into the timetable."
        actions={
          <>
            <Button variant="outline" className="rounded-2xl border-white/8 bg-white/5 text-slate-100">
              <Clock3 className="size-4" />
              Availability matrix
            </Button>
            <Button className="rounded-2xl">
              <ShieldCheck className="size-4" />
              Run overload check
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Faculty in rotation" value={String(faculty.length)} detail="Across CSE, ECE, and ME." icon={Users} progress={83} />
        <MetricCard label="Balanced allocations" value={String(faculty.filter((item) => item.status === "balanced").length)} detail="Healthy daily spread after latest draft." icon={ShieldCheck} progress={76} />
        <MetricCard label="Availability risk" value={String(faculty.filter((item) => item.status !== "balanced").length)} detail="Needs manual review before publish." icon={Clock3} tone="amber" progress={44} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <DataTableCard
          title="Faculty workload board"
          subtitle="Mock adapter mirrors the future faculty endpoint, including preferences and max daily periods."
          headers={["Faculty", "Availability", "Load", "Preferences", "Status"]}
          rows={rows}
        />
        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-white">Review highlights</CardTitle>
            <p className="text-sm text-slate-400">
              These are the highest-impact staffing issues affecting compactness and conflict rates.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.15rem] border border-amber-300/15 bg-amber-300/10 p-4">
              <p className="font-medium text-amber-100">Sara Joseph is over cap on Tuesday</p>
              <p className="mt-2 text-sm leading-6 text-amber-50/80">
                One theory block needs to move to Thursday or be reassigned to keep the daily cap contract intact.
              </p>
            </div>
            <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4 text-sm leading-6 text-slate-300">
              Ibrahim Khan is currently unavailable for P7, which narrows feasible lab placements for ECE.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
