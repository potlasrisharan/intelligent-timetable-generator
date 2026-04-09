import { CheckCircle2, FileText, FlaskConical, SlidersHorizontal } from "lucide-react"
import { DataTableCard } from "@/components/shared/data-table-card"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
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
        title="Course catalog"
        description="Manage weekly load, faculty ownership, and scheduling status for each course."
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
        <MetricCard label="Lab-backed modules" value={String(courses.filter((item) => item.labRequired).length)} detail="Courses that require practical sessions." icon={FlaskConical} tone="amber" progress={71} />
        <MetricCard label="Departments in scope" value={String(departments.length)} detail="Departments currently using the workspace." icon={FileText} progress={80} />
      </div>

      <DataTableCard
        title="Course catalog"
        subtitle="Weekly load, department, faculty, and scheduling status."
        headers={["Course", "Department", "Weekly load", "Faculty", "Status"]}
        rows={rows}
      />
    </div>
  )
}
