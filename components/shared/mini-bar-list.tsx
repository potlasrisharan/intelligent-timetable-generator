import type { MetricPoint } from "@/lib/types"
import { cn } from "@/lib/utils"

export function MiniBarList({
  title,
  subtitle,
  data,
  tone = "silver",
}: {
  title: string
  subtitle: string
  data: MetricPoint[]
  tone?: "silver" | "amber"
}) {
  return (
    <div className="glass-panel rounded-[1.4rem] p-5">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>
      <div className="mt-6 space-y-4">
        {data.map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-100">{item.label}</p>
                {item.emphasis ? (
                  <p className="text-xs text-slate-400">{item.emphasis}</p>
                ) : null}
              </div>
              <span className="font-data text-xs uppercase tracking-[0.24em] text-slate-400">
                {item.value}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/8">
              <div
                className={cn(
                  "h-2 rounded-full",
                  tone === "silver"
                    ? "bg-gradient-to-r from-slate-200 via-slate-400 to-slate-500"
                    : "bg-gradient-to-r from-amber-300 to-orange-400",
                )}
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
