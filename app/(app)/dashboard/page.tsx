import { dashboardService } from "@/lib/services/dashboard-service"
import { sectionService } from "@/lib/services/section-service"

import { DashboardRenderer } from "@/components/dashboard/dashboard-renderer"

export default async function DashboardPage() {
  const metrics = await dashboardService.getDashboardMetrics()
  const sections = await sectionService.getSections()

  return <DashboardRenderer metrics={metrics} sections={sections} />
}
