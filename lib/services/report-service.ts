import { auditTrail, reportSummary, timetableVersions } from "@/lib/mock-data"
import { getJsonWithFallback } from "@/lib/services/api-client"

export const reportService = {
  async getReportSummary() {
    return getJsonWithFallback("/reports/summary", reportSummary)
  },

  async getHistory() {
    return getJsonWithFallback("/reports/history", timetableVersions)
  },

  async getAuditTrail() {
    return getJsonWithFallback("/reports/audit-trail", auditTrail)
  },
}
