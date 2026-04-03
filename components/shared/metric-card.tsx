import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "silver",
  progress,
}: {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  tone?: "silver" | "amber" | "healthy"
  progress?: number
}) {
  return (
    <Card
      className={cn(
        "glass-panel section-ring rounded-[1.4rem] border-border/70",
        tone === "amber" && "metric-glow-amber",
        tone === "silver" && "metric-glow-silver",
        tone === "healthy" && "metric-glow-healthy"
      )}
    >
      <CardContent className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm text-slate-400">{label}</p>
            <div>
              <p className="text-3xl font-semibold text-white">{value}</p>
              <p className="mt-1 text-sm text-slate-300">{detail}</p>
            </div>
          </div>
          <div className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white">
            <Icon className="size-5" />
          </div>
        </div>
        {typeof progress === "number" ? (
          <div className="space-y-2">
            <div className="h-2 rounded-full bg-white/8">
              <div
                className={cn(
                  "h-2 rounded-full",
                  tone === "silver" && "bg-gradient-to-r from-slate-200 via-slate-400 to-slate-500",
                  tone === "amber" && "bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400",
                  tone === "healthy" && "bg-gradient-to-r from-emerald-300 via-green-400 to-emerald-500",
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="font-data text-[0.72rem] uppercase tracking-[0.24em] text-slate-400">
              {progress}% benchmark alignment
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
