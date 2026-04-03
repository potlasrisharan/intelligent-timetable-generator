import { CalendarRange } from "lucide-react"
import { appConfig } from "@/lib/config"
import { cn } from "@/lib/utils"

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex size-11 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-200 shadow-[0_0_0_1px_rgba(245,195,91,0.14),0_18px_40px_rgba(245,195,91,0.12)]">
        <CalendarRange className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="font-display truncate text-[0.95rem] font-semibold tracking-tight text-white">
          {appConfig.shortName}
        </p>
        <p className="truncate text-[0.72rem] uppercase tracking-[0.24em] text-slate-400">
          {appConfig.institution}
        </p>
      </div>
    </div>
  )
}
