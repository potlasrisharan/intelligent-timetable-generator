import type { ReactNode } from "react"
import { AlertTriangle, CheckCircle2, Clock3, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const toneMap = {
  healthy: {
    icon: CheckCircle2,
    className: "border-emerald-400/20 bg-emerald-400/12 text-emerald-200",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-400/20 bg-amber-400/12 text-amber-200",
  },
  critical: {
    icon: AlertTriangle,
    className: "border-rose-400/20 bg-rose-400/12 text-rose-200",
  },
  inactive: {
    icon: Clock3,
    className: "border-slate-400/20 bg-slate-400/12 text-slate-300",
  },
  active: {
    icon: Sparkles,
    className: "border-amber-400/20 bg-amber-400/12 text-amber-200",
  },
} as const

export function StatusBadge({
  tone,
  children,
}: {
  tone: keyof typeof toneMap
  children: ReactNode
}) {
  const Icon = toneMap[tone].icon

  return (
    <Badge variant="outline" className={toneMap[tone].className}>
      <Icon className="size-3.5" />
      {children}
    </Badge>
  )
}
