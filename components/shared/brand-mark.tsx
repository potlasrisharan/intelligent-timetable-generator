import { CalendarRange } from "lucide-react"
import { appConfig } from "@/lib/config"
import { cn } from "@/lib/utils"

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex size-11 items-center justify-center rounded-[1.35rem] border border-white/55 bg-[rgba(255,255,255,0.02)] text-[#4f83d8] shadow-[0_18px_38px_rgba(101,142,201,0.16)] backdrop-blur-[20px]">
        <CalendarRange className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="font-display truncate text-[0.95rem] font-semibold tracking-tight text-[#f8fafc]">
          {appConfig.shortName}
        </p>
        <p className="truncate text-[0.72rem] uppercase tracking-[0.24em] text-[#5c6f8d]">
          {appConfig.institution}
        </p>
      </div>
    </div>
  )
}
