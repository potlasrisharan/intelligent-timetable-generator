"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  BookOpen,
  Calendar,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  WandSparkles,
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarRange,
  Clock3,
  GitBranch,
  History,
  Layers3,
  PenTool,
  Users,
} from "lucide-react"
import { BrandMark } from "@/components/shared/brand-mark"
import { DottedSurface } from "@/components/shared/dotted-surface"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authService } from "@/lib/services/auth-service"
import type { AuthUser, UserRole } from "@/lib/types"
import { cn } from "@/lib/utils"

type NavItem = { href: string; label: string; icon: React.ElementType; description: string }
type NavSection = { title: string; items: NavItem[] }

const ADMIN_NAV: NavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Health, generation metrics, and deployment pulse" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { href: "/courses", label: "Courses", icon: BookOpen, description: "Theory and lab load planning" },
      { href: "/faculty", label: "Faculty", icon: Users, description: "Availability, workload, and coverage" },
      { href: "/rooms", label: "Rooms", icon: Building2, description: "Capacities, room types, and utilization" },
      { href: "/sections", label: "Sections", icon: Layers3, description: "Student cohorts and semester routing" },
      { href: "/combined-sections", label: "Combined", icon: GitBranch, description: "Merged section builders for shared delivery" },
      { href: "/timeslots", label: "Timeslots", icon: Clock3, description: "Periods, working hours, and lunch policy" },
      { href: "/holidays", label: "Holidays", icon: CalendarRange, description: "Academic blackout windows and impacts" },
    ],
  },
  {
    title: "Scheduling",
    items: [
      { href: "/editor", label: "Editor", icon: PenTool, description: "Draft grid, locked slots, and fine tuning" },
      { href: "/conflicts", label: "Conflicts", icon: AlertTriangle, description: "Rule violations and ranked resolutions" },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3, description: "Utilization, load balance, and exports" },
      { href: "/history", label: "History", icon: History, description: "Version lifecycle and restores" },
      { href: "/settings", label: "Settings", icon: Settings, description: "Platform, export, and deployment preferences" },
    ],
  },
]

const TEACHER_NAV: NavSection[] = [
  {
    title: "My Portal",
    items: [
      { href: "/teacher-dashboard", label: "My Schedule", icon: Calendar, description: "Your assigned classes this semester" },
    ],
  },
  {
    title: "Workspace",
    items: [
      { href: "/editor", label: "Timetable View", icon: PenTool, description: "Full timetable grid — read only" },
      { href: "/conflicts", label: "Conflicts", icon: AlertTriangle, description: "Scheduling issues affecting you" },
    ],
  },
]

const STUDENT_NAV: NavSection[] = [
  {
    title: "My Portal",
    items: [
      { href: "/student-dashboard", label: "My Timetable", icon: GraduationCap, description: "Your personal class schedule" },
    ],
  },
]

function getNav(role: UserRole): NavSection[] {
  if (role === "TEACHER") return TEACHER_NAV
  if (role === "STUDENT") return STUDENT_NAV
  return ADMIN_NAV
}

function getRoleBadgeColor(role: UserRole) {
  if (role === "TEACHER") return "text-blue-300"
  if (role === "STUDENT") return "text-emerald-300"
  return "text-amber-200/75"
}

function getRoleLabel(role: UserRole) {
  if (role === "TEACHER") return "Teacher Portal"
  if (role === "STUDENT") return "Student Portal"
  return "Administrator"
}

export function AppShell({
  children,
  user,
}: {
  children: ReactNode
  user: AuthUser
}) {
  const pathname = usePathname()
  const router = useRouter()
  const nav = getNav(user.role)

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <DottedSurface />
      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-[294px] shrink-0 border-r border-white/6 bg-[rgba(4,10,20,0.48)] p-4 backdrop-blur-xl lg:flex lg:flex-col">
          <div className="glass-panel-strong rounded-[1.8rem] p-5">
            <BrandMark />
            <div className="mt-6 rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
              <p className={`font-data text-[0.7rem] uppercase tracking-[0.26em] ${getRoleBadgeColor(user.role)}`}>
                {getRoleLabel(user.role)}
              </p>
              <h2 className="mt-3 text-lg font-semibold text-white">
                {user.role === "STUDENT"
                  ? "View your timetable"
                  : user.role === "TEACHER"
                  ? "View your assigned classes"
                  : "Manage the timetable"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {user.role === "STUDENT"
                  ? "Your section timetable, updated when admin publishes."
                  : user.role === "TEACHER"
                  ? "Your class assignments across rooms and periods."
                  : "Set up courses, rooms, sections, and schedule changes from one place."}
              </p>
            </div>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto">
            {nav.map((section) => (
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
                <p className="mt-1 text-xs text-slate-400">{user.role}</p>
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
                    placeholder={
                      user.role === "STUDENT"
                        ? "Search your classes, rooms, or faculty..."
                        : user.role === "TEACHER"
                        ? "Search your assigned slots or sections..."
                        : "Search sections, faculty, rooms, or schedules"
                    }
                    className="h-11 rounded-2xl border-white/8 bg-[rgba(9,16,29,0.7)] pl-10"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {user.role === "ADMIN" && (
                  <>
                    <Button className="rounded-2xl">
                      <WandSparkles className="size-4" />
                      Generate timetable
                    </Button>
                  </>
                )}
                {user.role === "TEACHER" && (
                  <div className="flex items-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/8 px-4 py-2">
                    <BookOpen className="size-4 text-blue-300" />
                    <span className="text-sm text-blue-200 font-medium">{user.name}</span>
                  </div>
                )}
                {user.role === "STUDENT" && (
                  <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-2">
                    <GraduationCap className="size-4 text-emerald-300" />
                    <span className="text-sm text-emerald-200 font-medium">{user.name}</span>
                  </div>
                )}
              </div>
            </div>
            {/* Mobile nav strip */}
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {nav.flatMap((section) => section.items).map((item) => {
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
        </div>
      </div>
    </div>
  )
}
