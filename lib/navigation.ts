import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Building2,
  CalendarRange,
  Clock3,
  GitBranch,
  History,
  LayoutDashboard,
  Layers3,
  PenTool,
  Settings,
  Users,
} from "lucide-react"

export type NavigationItem = {
  href: string
  label: string
  icon: LucideIcon
  description: string
}

export type NavigationSection = {
  title: string
  items: NavigationItem[]
}

export const navigationSections: NavigationSection[] = [
  {
    title: "Overview",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        description: "Health, generation metrics, and deployment pulse",
      },
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

export const secondaryLinks = [
  {
    href: "https://render.com",
    label: "Render + Supabase free-stack ready",
    icon: GitBranch,
  },
]
