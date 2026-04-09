"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { SignIn, useUser } from "@clerk/nextjs"
import { Shield, LayoutDashboard, GraduationCap, Users } from "lucide-react"

import { authService } from "@/lib/services/auth-service"
import type { SessionState, UserRole } from "@/lib/types"
import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/dashboard",
  TEACHER: "/teacher-dashboard",
  STUDENT: "/student-dashboard",
}

// ── Skeleton Loader Widget ──
function SkeletonAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-transparent text-foreground relative z-10 flex">
      {/* Sidebar Skeleton */}
      <aside className="hidden w-[294px] shrink-0 border-r border-white/30 bg-[rgba(255,255,255,0.12)] p-4 backdrop-blur-[26px] lg:flex lg:flex-col gap-4">
        <div className="glass-panel-strong rounded-[1.8rem] h-40 animate-pulse bg-white/5" />
        <div className="glass-panel-strong rounded-[1.5rem] flex-1 animate-pulse bg-white/5" />
        <div className="glass-panel-strong rounded-[1.5rem] h-20 animate-pulse bg-white/5" />
      </aside>
      
      {/* Main Content Skeleton */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Header Skeleton */}
        <header className="sticky top-0 z-20 border-b border-white/30 bg-[rgba(255,255,255,0.16)] px-4 py-4 backdrop-blur-[24px] md:px-6 h-20 flex items-center justify-between">
          <div className="h-10 w-64 rounded-full bg-white/10 animate-pulse" />
          <div className="h-10 w-32 rounded-full bg-white/10 animate-pulse" />
        </header>

        <main className="flex-1 px-4 py-5 md:px-6 md:py-6 relative">
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md rounded-2xl">
            <div className="glass-panel-strong rounded-3xl p-10 max-w-sm w-full mx-auto shadow-2xl flex flex-col items-center gap-6 border-white/20">
              <Shield className="size-10 text-amber-300 animate-pulse" />
              <div className="space-y-2 text-center">
                <h3 className="text-xl font-bold text-white">Authenticating</h3>
                <p className="text-sm text-slate-300 font-medium">Verifying your secure session...</p>
              </div>
              <div className="w-full h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-amber-300 w-1/2 animate-[shift_1.5s_infinite_ease-in-out]" style={{ background: "linear-gradient(90deg, transparent, rgba(253, 224, 71, 0.8), transparent)" }} />
              </div>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[1480px] opacity-20 pointer-events-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export function ProtectedApp({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  
  // Clerk Hook
  const { isLoaded: isClerkLoaded, isSignedIn: isClerkSignedIn, user: clerkUser } = useUser()

  // Local Demo Session
  const [session, setSession] = useState<SessionState>({
    status: "loading",
    user: null,
  })

  // Poll Local Storage once Clerk resolves
  useEffect(() => {
    if (!isClerkLoaded) return

    if (!isClerkSignedIn) {
      // Clear out any old local sessions if clerk is signed out
      authService.signOutLocally()
      setSession({ status: "unauthenticated", user: null })
      return
    }

    // Clerk is signed in, check if we mapped a demo role yet
    const localSession = authService.getSession()
    if (localSession.status === "authenticated" && localSession.user) {
      setSession(localSession)
    } else {
      // We need them to pick a role
      setSession({ status: "unauthenticated", user: null })
    }
  }, [isClerkLoaded, isClerkSignedIn])

  // Route protection
  useEffect(() => {
    if (session.status === "authenticated" && session.user) {
      const role = session.user.role
      const home = ROLE_HOME[role] ?? "/dashboard"

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
  }, [pathname, router, session])

  // Actions
  const pickRole = (role: UserRole) => {
    if (!clerkUser) return
    const newSessionUser = authService.setClerkDemoRole({
      fullName: clerkUser.fullName,
      primaryEmail: clerkUser.primaryEmailAddress?.emailAddress
    }, role)
    setSession({ status: "authenticated", user: newSessionUser })
  }

  // Render Logic
  
  // 1. Loading State (Skeleton)
  if (!isClerkLoaded || (isClerkSignedIn && session.status === "loading")) {
    return <SkeletonAppShell>{children}</SkeletonAppShell>
  }

  // 2. Unauthenticated State (Clerk Sign In)
  if (!isClerkSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <SignIn routing="hash" />
      </div>
    )
  }

  // 3. Authenticated but needs Role Selection
  if (isClerkSignedIn && session.status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div className="glass-panel-strong rounded-3xl p-8 max-w-2xl w-full border-white/20 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
             <Shield className="size-64" />
           </div>
           
           <h2 className="text-3xl font-bold text-white mb-2 relative z-10">Choose Your Workspace Role</h2>
           <p className="text-slate-300 mb-8 max-w-lg relative z-10">
             For this demonstration, please select how you would like to experience the Intelligent Timetable application.
           </p>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
             <Button
                variant="outline"
                className="h-auto flex flex-col items-center justify-center gap-4 py-8 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-400 group rounded-2xl"
                onClick={() => pickRole("ADMIN")}
             >
                <div className="p-4 rounded-full bg-amber-500/20 group-hover:bg-amber-500/30 transition-colors">
                   <LayoutDashboard className="size-8 text-amber-300" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-amber-100 text-lg">Administrator</p>
                  <p className="text-xs text-amber-300/70 mt-1">Full access to config and generation engine.</p>
                </div>
             </Button>
             
             <Button
                variant="outline"
                className="h-auto flex flex-col items-center justify-center gap-4 py-8 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-400 group rounded-2xl"
                onClick={() => pickRole("TEACHER")}
             >
                <div className="p-4 rounded-full bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                   <Users className="size-8 text-blue-300" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-blue-100 text-lg">Teacher</p>
                  <p className="text-xs text-blue-300/70 mt-1">Read-only view of faculty timetable and alerts.</p>
                </div>
             </Button>

             <Button
                variant="outline"
                className="h-auto flex flex-col items-center justify-center gap-4 py-8 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-400 group rounded-2xl"
                onClick={() => pickRole("STUDENT")}
             >
                <div className="p-4 rounded-full bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors">
                   <GraduationCap className="size-8 text-emerald-300" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-emerald-100 text-lg">Student</p>
                  <p className="text-xs text-emerald-300/70 mt-1">Focused view of your specific section's classes.</p>
                </div>
             </Button>
           </div>
        </div>
      </div>
    )
  }

  // 4. Fully Authenticated
  if (!session.user) return null
  return <AppShell user={session.user}>{children}</AppShell>
}
