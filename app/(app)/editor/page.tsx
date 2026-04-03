import { Lock, PenTool, WandSparkles } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { TimetableBoard } from "@/components/shared/timetable-board"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { sections } from "@/lib/mock-data"
import { scheduleService } from "@/lib/services/schedule-service"

export default async function EditorPage() {
  const entries = await scheduleService.getEditorEntries()
  const lockedSlots = await scheduleService.getLockedSlots()
  const [activeSection] = sections

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Scheduling / editor"
        title="Draft timetable editor"
        description="Review section-level schedules, preserve locked decisions, and keep drag-and-drop space ready for backend-powered interactions."
        actions={
          <>
            <StatusBadge tone="active">Editing {activeSection.name}</StatusBadge>
            <Button variant="outline" className="rounded-2xl border-white/8 bg-white/5 text-slate-100">
              <Lock className="size-4" />
              Show locked slots
            </Button>
            <Button className="rounded-2xl">
              <WandSparkles className="size-4" />
              Re-solve open slots
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-xl text-white">Section schedule canvas</CardTitle>
              <p className="font-data text-[0.72rem] uppercase tracking-[0.24em] text-slate-500">
                {activeSection.studentCount} students · compactness {activeSection.compactness}%
              </p>
            </div>
            <p className="text-sm text-slate-400">
              Visual layout is already drag-and-drop friendly. Backend interactions can later attach directly to these slots.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <TimetableBoard entries={entries} sectionId={activeSection.id} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass-panel section-ring rounded-[1.5rem]">
            <CardHeader className="space-y-2">
              <CardTitle className="text-xl text-white">Inspector</CardTitle>
              <p className="text-sm text-slate-400">
                Focused metadata for the currently selected section and slot family.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
                <p className="font-data text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">Section</p>
                <p className="mt-3 text-lg font-semibold text-white">{activeSection.name}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Semester {activeSection.semester} · Advisor {activeSection.advisor}
                </p>
              </div>
              <div className="rounded-[1.15rem] border border-amber-300/16 bg-amber-300/10 p-4">
                <p className="font-medium text-amber-100">Locked slots must survive regeneration</p>
                <p className="mt-2 text-sm leading-6 text-amber-50/80">
                  The current draft contains {lockedSlots.length} pinned decisions that the solver cannot relocate.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel section-ring rounded-[1.5rem]">
            <CardHeader className="space-y-2">
              <CardTitle className="text-xl text-white">Editing protocol</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
              <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
                <PenTool className="mb-3 size-4 text-amber-200" />
                Manual shifts can violate soft constraints, but hard-constraint breaks remain blocked.
              </div>
              <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
                Lab sessions stay chained, and lunch slots remain globally protected.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
