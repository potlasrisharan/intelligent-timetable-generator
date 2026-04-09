import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "silver",
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
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  )
}
