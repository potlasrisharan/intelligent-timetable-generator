import { GitBranch, Layers3, Users } from "lucide-react"
import { DataTableCard } from "@/components/shared/data-table-card"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
        title="Merged delivery for shared academic blocks"
        description="Handle large lectures and cross-section labs while keeping semester integrity and room capacity intact."
        actions={
          <Button className="rounded-2xl">
            <GitBranch className="size-4" />
            Create combined section
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Combined groups" value={String(combinedSections.length)} detail="Active merges in the current dataset." icon={GitBranch} progress={58} />
        <MetricCard label="Seats bundled" value={String(combinedSections.reduce((sum, item) => sum + item.combinedStudentCount, 0))} detail="Needs large-room coverage." icon={Users} tone="amber" progress={74} />
        <MetricCard label="Semester-safe merges" value={String(combinedSections.length)} detail="All current bundles stay semester aligned." icon={Layers3} progress={100} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <DataTableCard
          title="Combined section builder"
          subtitle="These merged delivery contracts align to the future combined-sections backend resource."
          headers={["Label", "Sections", "Combined size", "Faculty", "Assigned room"]}
          rows={rows}
        />
        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-white">Builder rules</CardTitle>
            <p className="text-sm text-slate-400">
              The UI prevents illegal bundles before they reach the solver.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-slate-300">
            <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
              Same-semester sections only.
            </div>
            <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
              Combined student count must fit the assigned room.
            </div>
            <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
              One faculty owner and one room per merged slot.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
