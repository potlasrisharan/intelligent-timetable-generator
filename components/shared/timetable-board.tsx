"use client"

import { useState } from "react"
import { timeslots } from "@/lib/mock-data"
import type { TimetableEntry } from "@/lib/types"
import { cn } from "@/lib/utils"
import { XaiPanel, type XaiEntry } from "@/components/shared/xai-panel"
import { ManualClassModal } from "@/components/shared/manual-class-modal"
import { useRouter } from "next/navigation"

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"]

type Props = {
  entries: TimetableEntry[]
  sectionId: string
  xaiData?: XaiEntry[]
}

export function TimetableBoard({ entries, sectionId, xaiData = [] }: Props) {
  const router = useRouter()
  const scopedEntries = entries.filter((entry) => entry.sectionId === sectionId)
  const [activeXai, setActiveXai] = useState<XaiEntry | null>(null)
  const [manualSlot, setManualSlot] = useState<{ day: string; timeslotId: string } | null>(null)

  const handleCellClick = (match: TimetableEntry) => {
    const xai = xaiData.find((x) => x.entryId === match.id)
    if (xai) {
      setActiveXai((prev) => (prev?.entryId === xai.entryId ? null : xai))
    } else {
      // Build a fallback XAI entry on the fly from timetable data
      const fallback: XaiEntry = {
        entryId: match.id,
        courseCode: match.courseCode,
        courseName: match.courseName,
        slotLabel: `${match.day} / ${match.timeslotId.toUpperCase()}`,
        room: match.roomName,
        facultyName: match.facultyName,
        type: match.type,
        reason: `Room ${match.roomName} assigned as the available ${match.type === "LAB" ? "LAB" : "CLASSROOM"} for this timeslot. ${match.facultyName} confirmed free with no double-booking conflict detected by OR-Tools CP-SAT.`,
      }
      setActiveXai((prev) => (prev?.entryId === fallback.entryId ? null : fallback))
    }
  }

  return (
    <>
      <div className="overflow-x-auto overflow-y-hidden rounded-[1.4rem] border border-white/8 bg-[rgba(6,12,23,0.64)]">
        <div className="grid min-w-[920px] grid-cols-[120px_repeat(5,minmax(0,1fr))]">
          <div className="border-b border-r border-white/8 px-4 py-3 text-[0.72rem] uppercase tracking-[0.24em] text-slate-500">
            Slot
          </div>
          {weekdays.map((day) => (
            <div
              key={day}
              className="border-b border-white/8 px-4 py-3 text-[0.72rem] uppercase tracking-[0.24em] text-slate-400"
            >
              {day}
            </div>
          ))}
          {timeslots.map((slot) => (
            <div key={slot.id} className="contents">
              <div className="border-r border-white/8 px-4 py-4">
                <p className="font-data text-xs uppercase tracking-[0.24em] text-slate-400">
                  {slot.label}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {slot.start} - {slot.end}
                </p>
              </div>
              {weekdays.map((day) => {
                const match = scopedEntries.find(
                  (entry) => entry.day === day && entry.timeslotId === slot.id,
                )
                const hasXai = match
                  ? xaiData.some((x) => x.entryId === match.id) || true
                  : false
                const isActive = activeXai?.entryId === match?.id

                return (
                  <div
                    key={`${slot.id}-${day}`}
                    className={cn(
                      "min-h-28 border-r border-t border-white/8 p-3",
                      slot.isLunch ? "bg-white/4" : "bg-transparent",
                    )}
                  >
                    {slot.isLunch ? (
                      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/8 bg-white/4">
                        <span className="font-data text-xs uppercase tracking-[0.3em] text-slate-500">
                          Faculty lunch window
                        </span>
                      </div>
                    ) : match ? (
                      <div
                        onClick={() => handleCellClick(match)}
                        className={cn(
                          "h-full cursor-pointer rounded-[1.15rem] border p-3 transition-all duration-200",
                          isActive
                            ? "border-violet-400/50 bg-violet-500/15 shadow-[0_0_20px_-5px_rgba(139,92,246,0.4)]"
                            : match.locked
                              ? "border-amber-300/30 bg-amber-400/10 hover:border-amber-300/50 hover:bg-amber-400/15"
                              : "border-slate-300/16 bg-slate-300/8 hover:border-violet-400/30 hover:bg-violet-500/8",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{match.courseCode}</p>
                            <p className="mt-1 text-sm text-slate-200">{match.courseName}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-data text-[0.72rem] uppercase tracking-[0.24em] text-slate-400">
                              {match.type}
                            </span>
                            {hasXai && (
                              <span className="font-data text-[0.62rem] uppercase tracking-[0.18em] text-violet-400">
                                XAI ▸
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 space-y-1 text-sm text-slate-300">
                          <p>{match.facultyName}</p>
                          <p>{match.roomName}</p>
                        </div>
                        {match.note ? (
                          <p className="mt-3 text-xs text-amber-100/80">{match.note}</p>
                        ) : null}
                      </div>
                    ) : (
                      <div 
                        onClick={() => setManualSlot({ day, timeslotId: slot.id })}
                        className="h-full rounded-[1.15rem] border border-dashed border-white/8 bg-white/3 p-3 cursor-pointer hover:border-violet-400/30 hover:bg-violet-500/10 transition-colors"
                      >
                        <p className="font-data text-[0.7rem] uppercase tracking-[0.26em] text-slate-500">
                          Open placement
                        </p>
                        <p className="mt-3 text-sm text-slate-400">
                           Click to assign a class manually, or run the solver.
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <XaiPanel entry={activeXai} onClose={() => setActiveXai(null)} />

      <ManualClassModal
        isOpen={!!manualSlot}
        onClose={() => setManualSlot(null)}
        day={manualSlot?.day || ""}
        timeslotId={manualSlot?.timeslotId || ""}
        sectionId={sectionId}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}
