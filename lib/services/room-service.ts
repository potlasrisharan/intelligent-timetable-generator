import { rooms } from "@/lib/mock-data"
import { getJsonWithFallback } from "@/lib/services/api-client"

export const roomService = {
  async getRooms() {
    return getJsonWithFallback("/resources/rooms", rooms)
  },
}
