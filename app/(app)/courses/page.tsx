import { CheckCircle2, FileText, FlaskConical, SlidersHorizontal } from "lucide-react"
import { DataTableCard } from "@/components/shared/data-table-card"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { courseService } from "@/lib/services/course-service"
import { faculty } from "@/lib/mock-data"

export default async function CoursesPage() {
  const courses = await courseService.getCourses()
  const departments = await courseService.getDepartments()

  const rows = courses.map((course) => {
    const owner = faculty.find((item) => item.id === course.facultyId)
    const department = departments.find((item) => item.id === course.departmentId)

    return [
      <div key={`${course.id}-code`}>
        <p className="font-medium text-white">{course.code}</p>
        <p className="mt-1 text-sm text-slate-400">{course.name}</p>
      </div>,
      <div key={`${course.id}-dept`} className="text-slate-300">
        {department?.shortCode} · Sem {course.semester}
      </div>,
      <div key={`${course.id}-load`} className="text-slate-300">
        {course.theoryHours}T / {course.practicalHours}P
      </div>,
      <div key={`${course.id}-faculty`} className="text-slate-300">
        {owner?.name}
      </div>,
      <StatusBadge key={`${course.id}-status`} tone={course.status === "scheduled" ? "healthy" : course.status === "review" ? "warning" : "active"}>
        {course.status}
      </StatusBadge>,
    ]
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuration / courses"
        title="Course intelligence and weekly load design"
        description="Define theory and lab hours, map faculty ownership, and keep course rules aligned with the solver contract before generation begins."
        actions={
          <>
            <Button variant="outline" className="rounded-2xl border-white/8 bg-white/5 text-slate-100">
              <SlidersHorizontal className="size-4" />
              Filter catalog
            </Button>
            <Button className="rounded-2xl">
              <FileText className="size-4" />
              Import CSV
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Configured courses" value={String(courses.length)} detail="Across all active departments." icon={CheckCircle2} progress={92} />
        <MetricCard label="Lab-backed modules" value={String(courses.filter((item) => item.labRequired).length)} detail="Consecutive practical windows enforced." icon={FlaskConical} tone="amber" progress={71} />
        <MetricCard label="Departments in scope" value={String(departments.length)} detail="Hackathon dataset loaded and solvable." icon={FileText} progress={80} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <DataTableCard
          title="Course catalog"
          subtitle="API-ready structure for the FastAPI course endpoint and validation pipeline."
          headers={["Course", "Department", "Weekly load", "Faculty", "Status"]}
          rows={rows}
        />

        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-white">Constraint notes</CardTitle>
            <p className="text-sm text-slate-400">
              These UI checks mirror the hard rules that the backend and solver will enforce.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              "Theory + practical hours must total above zero.",
              "Lab-required courses automatically demand lab room compatibility.",
              "Combined sections only merge within the same semester.",
              "Practical sessions remain consecutive during generation.",
            ].map((item) => (
              <div key={item} className="rounded-[1.15rem] border border-white/8 bg-white/4 px-4 py-3 text-sm leading-6 text-slate-300">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
