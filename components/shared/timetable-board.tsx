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
        reason: `${match.roomName} fits this ${match.type === "LAB" ? "lab" : "class"} slot, and ${match.facultyName} is available at the selected time.`,
      }
      setActiveXai((prev) => (prev?.entryId === fallback.entryId ? null : fallback))
    }
  }

  return (
    <>
      <div className="glass-panel section-ring overflow-x-auto overflow-y-hidden rounded-[1.5rem] border border-white/50">
        <div className="grid min-w-[1080px] grid-cols-[120px_repeat(5,minmax(0,1fr))]">
          <div className="border-b border-r border-white/15 px-4 py-3 text-[0.72rem] uppercase tracking-[0.24em] text-[#94a3b8]">
            Slot
          </div>
          {weekdays.map((day) => (
            <div
              key={day}
              className="border-b border-white/15 px-4 py-3 text-[0.72rem] uppercase tracking-[0.24em] text-[#cbd5e1]"
            >
              {day}
            </div>
          ))}
          {timeslots.map((slot) => (
            <div key={slot.id} className="contents">
              <div className="border-r border-white/15 px-4 py-4">
                <p className="font-data text-xs uppercase tracking-[0.24em] text-[#cbd5e1]">
                  {slot.label}
                </p>
                <p className="mt-2 text-sm text-[#94a3b8]">
                  {slot.start} - {slot.end}
                </p>
              </div>
              {weekdays.map((day) => {
                const match = scopedEntries.find(
                  (entry) => entry.day === day && entry.timeslotId === slot.id,
                )
                const isActive = activeXai?.entryId === match?.id

                return (
                  <div
                    key={`${slot.id}-${day}`}
                    className={cn(
                      "min-h-28 border-r border-t border-white/15 p-3",
                      slot.isLunch ? "bg-[rgba(255,255,255,0.01)]" : "bg-transparent",
                    )}
                  >
                    {slot.isLunch ? (
                      <div className="liquid-surface flex h-full items-center justify-center rounded-2xl border border-dashed border-white/35 bg-[rgba(255,255,255,0.01)]">
                        <span className="font-data text-xs uppercase tracking-[0.3em] text-[#94a3b8]">
                          Faculty lunch window
                        </span>
                      </div>
                    ) : match ? (
                      <div
                        onClick={() => handleCellClick(match)}
                        className={cn(
                          "liquid-surface h-full cursor-pointer rounded-[1.25rem] border p-3 transition-all duration-200 backdrop-blur-[28px] backdrop-saturate-[160%]",
                          isActive
                            ? "border-[#9baaf4]/50 bg-[rgba(149,160,255,0.24)] shadow-[0_18px_44px_-24px_rgba(94,109,199,0.5)]"
                            : match.locked
                              ? "border-amber-300/40 bg-[rgba(251,191,36,0.18)] hover:border-amber-300/60 hover:bg-[rgba(251,191,36,0.24)]"
                              : "border-white/40 bg-[rgba(255,255,255,0.01)] hover:border-[#9baaf4]/40 hover:bg-[rgba(149,160,255,0.16)]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#f8fafc]">{match.courseCode}</p>
                            <p className="mt-1 text-sm text-[#cbd5e1]">{match.courseName}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-data text-[0.72rem] uppercase tracking-[0.24em] text-[#94a3b8]">
                              {match.type}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 space-y-1 text-sm text-[#cbd5e1]">
                          <p>{match.facultyName}</p>
                          <p>{match.roomName}</p>
                        </div>
                        {match.note ? (
                          <p className="mt-3 text-xs text-[#8a5a13]">{match.note}</p>
                        ) : null}
                      </div>
                    ) : (
                      <div 
                        onClick={() => setManualSlot({ day, timeslotId: slot.id })}
                        className="liquid-surface h-full cursor-pointer rounded-[1.25rem] border border-dashed border-white/35 bg-[rgba(255,255,255,0.01)] p-3 transition-colors hover:border-[#9baaf4]/40 hover:bg-[rgba(149,160,255,0.14)]"
                      >
                        <p className="font-data text-[0.7rem] uppercase tracking-[0.26em] text-[#94a3b8]">
                          Open placement
                        </p>
                        <p className="mt-3 text-sm text-[#94a3b8]">
                           Click to assign a class manually.
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
