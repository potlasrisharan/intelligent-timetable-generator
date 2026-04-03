"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { authService } from "@/lib/services/auth-service"
import type { SessionState } from "@/lib/types"
import { AppShell } from "@/components/layout/app-shell"

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
