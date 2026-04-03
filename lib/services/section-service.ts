import { combinedSections, holidays, sections, timeslots } from "@/lib/mock-data"
import { getJsonWithFallback } from "@/lib/services/api-client"

export const sectionService = {
  async getSections() {
    return getJsonWithFallback("/resources/sections", sections)
  },

  async getCombinedSections() {
    return getJsonWithFallback("/resources/combined-sections", combinedSections)
  },

  async getTimeslots() {
    return getJsonWithFallback("/resources/timeslots", timeslots)
  },

  async getHolidays() {
    return getJsonWithFallback("/resources/holidays", holidays)
  },
}
