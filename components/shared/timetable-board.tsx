import { timeslots } from "@/lib/mock-data"
import type { TimetableEntry } from "@/lib/types"
import { cn } from "@/lib/utils"

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"]

export function TimetableBoard({
  entries,
  sectionId,
}: {
  entries: TimetableEntry[]
  sectionId: string
}) {
  const scopedEntries = entries.filter((entry) => entry.sectionId === sectionId)

  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-white/8 bg-[rgba(6,12,23,0.64)]">
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
                      className={cn(
                        "h-full rounded-[1.15rem] border p-3",
                        match.locked
                          ? "border-amber-300/30 bg-amber-400/10"
                          : "border-slate-300/16 bg-slate-300/8",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{match.courseCode}</p>
                          <p className="mt-1 text-sm text-slate-200">{match.courseName}</p>
                        </div>
                        <span className="font-data text-[0.72rem] uppercase tracking-[0.24em] text-slate-400">
                          {match.type}
                        </span>
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
                    <div className="h-full rounded-[1.15rem] border border-dashed border-white/8 bg-white/3 p-3">
                      <p className="font-data text-[0.7rem] uppercase tracking-[0.26em] text-slate-500">
                        Open placement
                      </p>
                      <p className="mt-3 text-sm text-slate-400">
                        Solver can assign the next highest-scoring course here.
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
  )
}
