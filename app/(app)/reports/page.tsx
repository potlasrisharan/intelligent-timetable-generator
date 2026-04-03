import { Download, FileText } from "lucide-react"
import { MiniBarList } from "@/components/shared/mini-bar-list"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { reportService } from "@/lib/services/report-service"

export default async function ReportsPage() {
  const reportSummary = await reportService.getReportSummary()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights / reports"
        title="Utilization, workload, and export reporting"
        description="Give judges a full picture of schedule quality with room usage, faculty gap pressure, compactness, and polished export surfaces."
        actions={
          <Button className="rounded-2xl">
            <Download className="size-4" />
            Export active bundle
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <MiniBarList title="Room utilization" subtitle="Campus space pressure by room family." data={reportSummary.roomUtilization} />
        <MiniBarList title="Faculty gaps" subtitle="How close the current draft is to idle-gap targets." data={reportSummary.facultyGaps} tone="amber" />
        <MiniBarList title="Compactness" subtitle="Semester-level timetable density scores." data={reportSummary.compactness} />
      </div>

      <Card className="glass-panel section-ring rounded-[1.5rem]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl text-white">Export hub</CardTitle>
          <p className="text-sm text-slate-400">
            These controls match the eventual PDF/Excel backend capabilities described in the architecture.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {reportSummary.exports.map((item, index) => (
            <div key={item.label} className="rounded-[1.2rem] border border-white/8 bg-white/4 p-5">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-white/8 bg-white/5 text-amber-200">
                {index < 2 ? <FileText className="size-5" /> : <Download className="size-5" />}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">{item.label}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
              <Button variant="outline" className="mt-5 rounded-2xl border-white/8 bg-white/5 text-slate-100">
                Prepare export
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
