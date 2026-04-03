import { dashboardService } from "@/lib/services/dashboard-service"
import { courseService } from "@/lib/services/course-service"
import { sectionService } from "@/lib/services/section-service"

import { DashboardRenderer } from "@/components/dashboard/dashboard-renderer"

export default async function DashboardPage() {
  const metrics = await dashboardService.getDashboardMetrics()
  const courses = await courseService.getCourses()
  const sections = await sectionService.getSections()

  return <DashboardRenderer metrics={metrics} courses={courses} sections={sections} />
}
