import { Lock, Settings2, ShieldCheck, SlidersHorizontal } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights / settings"
        title="Workspace settings"
        description="Review the main scheduling and access preferences used in this prototype."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-white">Scheduling defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
            {[
              {
                icon: Settings2,
                title: "Regeneration keeps locked slots in place.",
              },
              {
                icon: SlidersHorizontal,
                title: "Scheduling favors balanced faculty load, compact days, and room fit.",
              },
              {
                icon: ShieldCheck,
                title: "Exports remain available in printable and spreadsheet formats.",
              },
            ].map(({ icon: Icon, title }) => (
              <div key={title} className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
                <Icon className="mb-3 size-4 text-amber-200" />
                {title}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-white">Access roles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
            <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
              <p className="font-medium text-white">Admin</p>
              <p className="mt-2">Manages data, generates schedules, resolves conflicts, and publishes updates.</p>
            </div>
            <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
              <p className="font-medium text-white">Teacher</p>
              <p className="mt-2">Views assigned classes and checks the current timetable.</p>
            </div>
            <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
              <p className="font-medium text-white">Student</p>
              <p className="mt-2">Views the published class schedule for the assigned section.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-white">Workspace notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
            <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
              <Lock className="mb-3 size-4 text-amber-200" />
              Use the configuration pages to manage courses, faculty, rooms, sections, timeslots, and holidays.
            </div>
            <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
              <ShieldCheck className="mb-3 size-4 text-emerald-200" />
              Conflicts should be resolved before publishing a new schedule version.
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-white">Version handling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
            <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
              <Settings2 className="mb-3 size-4 text-amber-200" />
              Draft and active schedules remain separated so changes can be reviewed safely.
            </div>
            <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
              <SlidersHorizontal className="mb-3 size-4 text-amber-200" />
              Use the editor to check placements before promoting a draft to the active timetable.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
