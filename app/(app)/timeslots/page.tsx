import { Clock3, CalendarRange } from "lucide-react"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { sectionService } from "@/lib/services/section-service"

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

export default async function TimeslotsPage() {
  const timeslots = await sectionService.getTimeslots()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuration / timeslots"
        title="Working hours, lunch policy, and period geometry"
        description="The period matrix defines where the solver is allowed to place classes, which slots are blocked, and where labs can chain back-to-back."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Working days" value={String(weekdays.length)} detail="Mon-Fri schedule for the demo institution." icon={CalendarRange} progress={100} />
        <MetricCard label="Instructional slots" value={String(timeslots.filter((slot) => !slot.isLunch).length)} detail="Available for theory and lab placement each day." icon={Clock3} progress={88} />
        <MetricCard label="Lunch window" value="1 fixed block" detail="Protected from scheduling across all departments." icon={Clock3} tone="amber" progress={100} />
      </div>

      <div className="glass-panel section-ring rounded-[1.5rem] p-6">
        <div className="grid gap-4 xl:grid-cols-[180px_repeat(5,minmax(0,1fr))]">
          <div>
            <p className="font-data text-[0.72rem] uppercase tracking-[0.24em] text-slate-500">Period</p>
          </div>
          {weekdays.map((day) => (
            <p key={day} className="font-data text-[0.72rem] uppercase tracking-[0.24em] text-slate-400">
              {day}
            </p>
          ))}
          {timeslots.map((slot) => (
            <div key={slot.id} className="contents">
              <div className="rounded-[1.2rem] border border-white/8 bg-white/4 px-4 py-4">
                <p className="font-medium text-white">{slot.label}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {slot.start} - {slot.end}
                </p>
              </div>
              {weekdays.map((day) => (
                <div
                  key={`${slot.id}-${day}`}
                  className={`rounded-[1.2rem] border px-4 py-4 text-sm ${
                    slot.isLunch
                      ? "border-amber-300/18 bg-amber-300/10 text-amber-100"
                      : "border-white/8 bg-white/4 text-slate-300"
                  }`}
                >
                  {slot.isLunch
                    ? "Lunch break locked"
                    : slot.label === "P6" || slot.label === "P7"
                      ? "Preferred for consecutive labs"
                      : "Standard instructional window"}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
