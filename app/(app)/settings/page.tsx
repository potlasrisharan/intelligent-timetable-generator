import { Globe, Key, Server, ShieldCheck, SlidersHorizontal } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { envConfig, isApiConfigured, isSupabaseConfigured } from "@/lib/config"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights / settings"
        title="Deployment, auth, and generation preferences"
        description="This workspace is already shaped around your free deployment stack, with clean integration contracts for Supabase and FastAPI."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-white">Free-stack deployment map</CardTitle>
            <p className="text-sm text-slate-400">
              Platform wiring chosen for the hackathon build and later production hardening.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Frontend", "Next.js on Vercel"],
              ["Backend API", "FastAPI on Render"],
              ["Solver", "OR-Tools on Render worker"],
              ["Database + Auth", "Supabase Postgres + Supabase Auth"],
              ["Storage", "Supabase Storage"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1.15rem] border border-white/8 bg-white/4 px-4 py-3">
                <p className="font-data text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">{label}</p>
                <p className="mt-2 text-sm font-medium text-white">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-white">Environment contract</CardTitle>
            <p className="text-sm text-slate-400">
              Frontend env assumptions are already reserved so the backend can plug in without route rewrites.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-data text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">
                    NEXT_PUBLIC_API_BASE_URL
                  </p>
                  <p className="mt-2 text-sm text-white">{envConfig.apiBaseUrl}</p>
                </div>
                <StatusBadge tone={isApiConfigured ? "active" : "inactive"}>
                  {isApiConfigured ? "local default" : "not set"}
                </StatusBadge>
              </div>
            </div>
            <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-data text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">
                    Supabase auth keys
                  </p>
                  <p className="mt-2 text-sm text-white">{envConfig.supabaseUrl}</p>
                </div>
                <StatusBadge tone={isSupabaseConfigured ? "healthy" : "warning"}>
                  {isSupabaseConfigured ? "configured" : "demo mode"}
                </StatusBadge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-white">Auth preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
            <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
              <Key className="mb-3 size-4 text-amber-200" />
              Demo auth currently uses local session storage, but the contract is shaped for Supabase sign-in and password reset flows.
            </div>
            <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
              <ShieldCheck className="mb-3 size-4 text-emerald-200" />
              Role names already match the PRD: Super Admin, Department Admin, Faculty, and Student.
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel section-ring rounded-[1.5rem]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-white">Generation defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
            <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
              <Server className="mb-3 size-4 text-amber-200" />
              Default mode: partial regenerate with locked-slot preservation.
            </div>
            <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
              <SlidersHorizontal className="mb-3 size-4 text-amber-200" />
              Solver preferences prioritize faculty gap reduction, workload balance, and room utilization.
            </div>
            <div className="rounded-[1.15rem] border border-white/8 bg-white/4 p-4">
              <Globe className="mb-3 size-4 text-slate-200" />
              Export behavior assumes PDF and Excel generation from the FastAPI backend.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
