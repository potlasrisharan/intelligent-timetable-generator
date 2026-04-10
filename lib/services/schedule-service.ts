import { conflicts, editorEntries, lockedSlots, timetableVersions } from "@/lib/mock-data"
import { getJsonWithFallback, postJsonWithFallback } from "@/lib/services/api-client"
import type { TimetableEntry, LockedSlot, Conflict, TimetableVersion } from "@/lib/types"

export const scheduleService = {
  async getEditorEntries(): Promise<TimetableEntry[]> {
    return getJsonWithFallback<TimetableEntry[]>("/schedule/entries", editorEntries as TimetableEntry[])
  },

  async getLockedSlots(): Promise<LockedSlot[]> {
    return getJsonWithFallback<LockedSlot[]>("/schedule/locked-slots", lockedSlots as LockedSlot[])
  },

  async getConflicts(): Promise<Conflict[]> {
    return getJsonWithFallback<Conflict[]>("/schedule/conflicts", conflicts as Conflict[])
  },

  async getVersions(): Promise<TimetableVersion[]> {
    return getJsonWithFallback<TimetableVersion[]>("/schedule/versions", timetableVersions as TimetableVersion[])
  },

  async triggerGenerate(scope = "partial"): Promise<{ok: boolean, message: string}> {
    return postJsonWithFallback("/schedule/generate", { scope }, {
      ok: true,
      message: `Demo generate queued for ${scope} scope.`,
    })
  },

  async resolveConflict(conflictId: string, resolution?: string): Promise<{ok: boolean, message: string}> {
    return postJsonWithFallback(`/schedule/conflicts/${conflictId}/resolve`, { resolution }, {
      ok: true,
      message: "Conflict resolved.",
    })
  },

  async addManualEntry(payload: { day: string; timeslotId: string; sectionId: string; courseCode: string; courseName: string; facultyName: string; roomName: string; type: "THEORY" | "LAB" }): Promise<TimetableEntry> {
    return postJsonWithFallback<TimetableEntry>("/schedule/manual-entry", payload, {
      id: `evt-man-${Math.random().toString(36).substring(2, 11)}`,
      day: payload.day,
      timeslotId: payload.timeslotId,
      sectionId: payload.sectionId,
      courseCode: payload.courseCode,
      courseName: payload.courseName,
      facultyName: payload.facultyName,
      roomName: payload.roomName,
      type: payload.type,
      locked: true,
      combined: false,
      note: "Manually assigned block (Mock)",
    })
  },

  async publishTimetable(): Promise<{ status: string; entries_count: number; version: string; message: string }> {
    return postJsonWithFallback("/schedule/publish", {}, {
      status: "published",
      entries_count: 0,
      version: "Master Schedule",
      message: "Published successfully.",
    })
  },

  async getPublishedEntries(): Promise<TimetableEntry[]> {
    return getJsonWithFallback<TimetableEntry[]>("/schedule/published-entries", editorEntries as TimetableEntry[])
  },
}
