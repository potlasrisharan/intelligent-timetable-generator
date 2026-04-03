import { AlertTriangle, BookOpen, Cpu, GitBranch, GraduationCap, WandSparkles } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { MetricCard } from "@/components/shared/metric-card"
import { MiniBarList } from "@/components/shared/mini-bar-list"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
