import { GraduationCap, Layers3, Users } from "lucide-react"
import { DataTableCard } from "@/components/shared/data-table-card"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { sectionService } from "@/lib/services/section-service"

export default async function SectionsPage() {
  const sections = await sectionService.getSections()

  const rows = sections.map((section) => [
    <div key={`${section.id}-name`}>
      <p className="font-medium text-white">{section.name}</p>
      <p className="mt-1 text-sm text-slate-400">Semester {section.semester}</p>
    </div>,
    <div key={`${section.id}-advisor`} className="text-slate-300">
      {section.advisor}
    </div>,
    <div key={`${section.id}-size`} className="text-slate-300">
      {section.studentCount} students
    </div>,
    <StatusBadge key={`${section.id}-compactness`} tone={section.compactness >= 85 ? "healthy" : "warning"}>
      {section.compactness}% compactness
    </StatusBadge>,
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuration / sections"
        title="Section sizing and semester routing"
        description="Sections determine room fit, timetable compactness, and how well the system balances demand across the academic week."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Sections in play" value={String(sections.length)} detail="Ready to route through the editor." icon={Layers3} progress={78} />
        <MetricCard label="Students covered" value={String(sections.reduce((sum, section) => sum + section.studentCount, 0))} detail="Across all configured cohorts." icon={Users} progress={86} />
        <MetricCard label="High compactness sections" value={String(sections.filter((section) => section.compactness >= 85).length)} detail="Sections with tightly grouped schedules." icon={GraduationCap} tone="amber" progress={66} />
      </div>

      <DataTableCard
        title="Section roster"
        subtitle="Student counts, advisors, and compactness overview."
        headers={["Section", "Advisor", "Student count", "Compactness"]}
        rows={rows}
      />
    </div>
  )
}
