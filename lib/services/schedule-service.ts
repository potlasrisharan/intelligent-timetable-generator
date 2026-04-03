import { conflicts, editorEntries, lockedSlots, timetableVersions } from "@/lib/mock-data"
import { getJsonWithFallback, postJsonWithFallback } from "@/lib/services/api-client"

export const scheduleService = {
  async getEditorEntries() {
    return getJsonWithFallback("/schedule/entries", editorEntries)
  },

  async getLockedSlots() {
    return getJsonWithFallback("/schedule/locked-slots", lockedSlots)
  },

  async getConflicts() {
    return getJsonWithFallback("/schedule/conflicts", conflicts)
  },

  async getVersions() {
    return getJsonWithFallback("/schedule/versions", timetableVersions)
  },

  async triggerGenerate(scope = "partial") {
    return postJsonWithFallback("/schedule/generate", { scope }, {
      ok: true,
      message: `Demo generate queued for ${scope} scope.`,
    })
  },
}
