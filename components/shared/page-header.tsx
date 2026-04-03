import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("page-shell glass-panel-strong section-ring rounded-[1.6rem] p-6 md:p-7", className)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <p className="font-data text-[0.72rem] uppercase tracking-[0.28em] text-amber-200/80">
            {eyebrow}
          </p>
          <div className="space-y-2">
            <h1 className="text-balance-pretty text-3xl font-semibold text-white md:text-4xl">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
              {description}
            </p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  )
}
