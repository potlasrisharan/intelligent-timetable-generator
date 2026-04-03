import { faculty } from "@/lib/mock-data"
import { getJsonWithFallback } from "@/lib/services/api-client"

export const facultyService = {
  async getFaculty() {
    return getJsonWithFallback("/resources/faculty", faculty)
  },
}
