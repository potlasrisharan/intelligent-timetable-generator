"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { authService } from "@/lib/services/auth-service"
import type { SessionState } from "@/lib/types"
import { AppShell } from "@/components/layout/app-shell"

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/dashboard",
  TEACHER: "/teacher-dashboard",
  STUDENT: "/student-dashboard",
}

export function ProtectedApp({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [session, setSession] = useState<SessionState>({
    status: "loading",
    user: null,
  })

  useEffect(() => {
    const currentSession = authService.getSession()
    setSession(currentSession)

    if (currentSession.status === "unauthenticated") {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`)
      return
    }

    if (currentSession.status === "authenticated" && currentSession.user) {
      const role = currentSession.user.role
      const home = ROLE_HOME[role] ?? "/dashboard"

      // Enforce role-locked routes
      const adminOnly = pathname === "/dashboard"
      const teacherOnly = pathname === "/teacher-dashboard"
      const studentOnly = pathname === "/student-dashboard"

      if (adminOnly && role !== "ADMIN") {
        router.replace(home)
        return
      }
      if (teacherOnly && role !== "TEACHER") {
        router.replace(home)
        return
      }
      if (studentOnly && role !== "STUDENT") {
        router.replace(home)
        return
      }
    }
  }, [pathname, router])

  if (session.status !== "authenticated" || !session.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="glass-panel-strong rounded-[1.6rem] px-8 py-7 text-center">
          <LoaderCircle className="mx-auto size-8 animate-spin text-amber-200" />
          <p className="mt-4 text-sm text-slate-300">Securing the timetable workspace...</p>
        </div>
      </div>
    )
  }

  return <AppShell user={session.user}>{children}</AppShell>
}
