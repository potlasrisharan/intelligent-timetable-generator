import { courses, departments } from "@/lib/mock-data"
import { getJsonWithFallback } from "@/lib/services/api-client"

export const courseService = {
  async getCourses() {
    return getJsonWithFallback("/resources/courses", courses)
  },

  async getDepartments() {
    return getJsonWithFallback("/resources/departments", departments)
  },
}
