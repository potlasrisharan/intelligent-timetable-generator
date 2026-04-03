import { dashboardMetrics, timetableVersions } from "@/lib/mock-data"
import { getJsonWithFallback } from "@/lib/services/api-client"

export const dashboardService = {
  async getDashboardMetrics() {
    return getJsonWithFallback("/dashboard/metrics", dashboardMetrics)
  },

  async getVersions() {
    return getJsonWithFallback("/dashboard/versions", timetableVersions)
  },
}
