"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Bell,
  ChevronRight,
  Command,
  LogOut,
  Search,
  Sparkles,
  WandSparkles,
} from "lucide-react"
import { BrandMark } from "@/components/shared/brand-mark"
import { DottedSurface } from "@/components/shared/dotted-surface"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { navigationSections } from "@/lib/navigation"
import { authService } from "@/lib/services/auth-service"
import type { AuthUser } from "@/lib/types"
import { cn } from "@/lib/utils"

export function AppShell({
  children,
  user,
}: {
  children: ReactNode
  user: AuthUser
}) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <DottedSurface />
      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-[294px] shrink-0 border-r border-white/6 bg-[rgba(4,10,20,0.48)] p-4 backdrop-blur-xl lg:flex lg:flex-col">
          <div className="glass-panel-strong rounded-[1.8rem] p-5">
            <BrandMark />
            <div className="mt-6 rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
              <p className="font-data text-[0.7rem] uppercase tracking-[0.26em] text-amber-200/75">
                Hackathon workspace
              </p>
              <h2 className="mt-3 text-lg font-semibold text-white">
                Multi-section academic scheduling
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Deployable frontend for Vercel, ready to pair with FastAPI, Supabase, and OR-Tools.
              </p>
            </div>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto">
            {navigationSections.map((section) => (
              <div key={section.title} className="glass-panel mt-4 rounded-[1.5rem] p-3">
                <p className="px-3 pb-2 font-data text-[0.68rem] uppercase tracking-[0.26em] text-slate-500">
                  {section.title}
                </p>
                <nav className="space-y-1">
                  {section.items.map((item) => {
                    const active = pathname === item.href
                    return (
                      <Button
                        key={item.href}
                        asChild
                        variant="ghost"
                        className={cn(
                          "h-10 w-full justify-start rounded-[0.9rem] px-3 text-left text-slate-300 hover:bg-white/7 hover:text-white",
                          active &&
                            "border border-amber-300/16 bg-amber-300/10 text-white shadow-[0_0_0_1px_rgba(245,195,91,0.12)]",
                        )}
                      >
                        <Link href={item.href} className="flex items-center gap-3 w-full truncate">
                          <item.icon className="shrink-0 size-[16px]" />
                          <span className="text-sm font-medium truncate">{item.label}</span>
                        </Link>
                      </Button>
                    )
                  })}
                </nav>
              </div>
            ))}
          </div>

          <div className="glass-panel rounded-[1.5rem] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="mt-1 text-xs text-slate-400">{user.role.replace("_", " ")}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-slate-300 hover:bg-white/7"
                onClick={async () => {
                  await authService.signOut()
                  router.replace("/auth/login")
                }}
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/6 bg-[rgba(4,10,20,0.42)] px-4 py-4 backdrop-blur-xl md:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <BrandMark className="lg:hidden" />
                <div className="relative max-w-xl flex-1 xl:min-w-[380px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    aria-label="Search the scheduling workspace"
                    placeholder="Search sections, faculty, room availability, or solver runs"
                    className="h-11 rounded-2xl border-white/8 bg-[rgba(9,16,29,0.7)] pl-10"
                  />
                </div>
                <Button variant="outline" className="hidden rounded-2xl border-white/8 bg-white/5 text-slate-200 md:flex">
                  <Command className="size-4" />
                  Command Palette
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" className="rounded-2xl border-white/8 bg-white/5 text-slate-200">
                  <Bell className="size-4" />
                  3 alerts
                </Button>
                <Button className="rounded-2xl">
                  <WandSparkles className="size-4" />
                  Generate timetable
                </Button>
              </div>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {navigationSections.flatMap((section) => section.items).map((item) => {
                const active = pathname === item.href
                return (
                  <Button
                    key={item.href}
                    asChild
                    size="sm"
                    variant={active ? "default" : "outline"}
                    className={cn(
                      "rounded-full whitespace-nowrap",
                      !active && "border-white/8 bg-white/5 text-slate-200",
                    )}
                  >
                    <Link href={item.href}>
                      {item.label}
                      <ChevronRight className="size-3.5" />
                    </Link>
                  </Button>
                )
              })}
            </div>
          </header>

          <main className="flex-1 px-4 py-5 md:px-6 md:py-6">
            <div className="mx-auto w-full max-w-[1480px]">{children}</div>
          </main>

          <footer className="px-4 pb-6 md:px-6">
            <div className="glass-panel rounded-[1.35rem] px-5 py-4 text-sm text-slate-300">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 text-slate-200">
                  <Sparkles className="size-4 text-amber-200" />
                  Judges can explore the full scheduling experience with a matching FastAPI contract behind it.
                </div>
                <p className="font-data text-[0.72rem] uppercase tracking-[0.24em] text-slate-500">
                  Vercel · Render · Supabase · OR-Tools ready
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
