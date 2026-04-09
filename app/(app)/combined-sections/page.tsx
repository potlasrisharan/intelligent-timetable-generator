import { GitBranch, Layers3, Users } from "lucide-react"
import { DataTableCard } from "@/components/shared/data-table-card"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { faculty, rooms } from "@/lib/mock-data"
import { sectionService } from "@/lib/services/section-service"

export default async function CombinedSectionsPage() {
  const combinedSections = await sectionService.getCombinedSections()

  const rows = combinedSections.map((item) => {
    const facultyMember = faculty.find((member) => member.id === item.facultyId)
    const room = rooms.find((entry) => entry.id === item.roomId)

    return [
      <div key={`${item.id}-label`}>
        <p className="font-medium text-white">{item.label}</p>
        <p className="mt-1 text-sm text-slate-400">{item.courseCode}</p>
      </div>,
      <div key={`${item.id}-sections`} className="text-slate-300">
        {item.sectionIds.join(" + ")}
      </div>,
      <div key={`${item.id}-size`} className="text-slate-300">
        {item.combinedStudentCount} students
      </div>,
      <div key={`${item.id}-owner`} className="text-slate-300">
        {facultyMember?.name}
      </div>,
      <StatusBadge key={`${item.id}-room`} tone="active">
        {room?.name}
      </StatusBadge>,
    ]
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuration / combined sections"
        title="Combined sections"
        description="Group sections that share a class while keeping semester alignment and room capacity clear."
        actions={
          <Button className="rounded-2xl">
            <GitBranch className="size-4" />
            Create combined section
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Combined groups" value={String(combinedSections.length)} detail="Active merges in the current dataset." icon={GitBranch} progress={58} />
        <MetricCard label="Seats bundled" value={String(combinedSections.reduce((sum, item) => sum + item.combinedStudentCount, 0))} detail="Students covered by shared classes." icon={Users} tone="amber" progress={74} />
        <MetricCard label="Semester-safe merges" value={String(combinedSections.length)} detail="Current groups stay within the same semester." icon={Layers3} progress={100} />
      </div>

      <DataTableCard
        title="Combined section list"
        subtitle="Shared classes, grouped sections, faculty owner, and assigned room."
        headers={["Label", "Sections", "Combined size", "Faculty", "Assigned room"]}
        rows={rows}
      />
    </div>
  )
}
