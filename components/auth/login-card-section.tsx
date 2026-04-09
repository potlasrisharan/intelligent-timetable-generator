"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
} from "lucide-react"
import { BrandMark } from "@/components/shared/brand-mark"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/lib/services/auth-service"

export function LoginCardSection({ nextPath }: { nextPath: string }) {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("admin@sau.edu")
  const [password, setPassword] = useState("demo-access")
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  return (
    <section className="relative min-h-screen overflow-hidden bg-transparent text-foreground">
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <BrandMark />
      </header>

      <div className="relative z-10 grid min-h-[calc(100vh-88px)] place-items-center px-4 pb-10">
        <Card className="glass-panel-strong section-ring w-full max-w-md rounded-[1.8rem] border-white/10 bg-[rgba(9,15,28,0.72)]">
          <CardHeader className="space-y-3">
            <div className="space-y-2">
              <CardTitle className="text-3xl text-white">Welcome back</CardTitle>
              <CardDescription className="text-base leading-6 text-slate-300">
                Sign in to access your timetable workspace.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="border-white/10 bg-[rgba(8,14,27,0.8)] pl-10 text-slate-100"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password" className="text-slate-300">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="border-white/10 bg-[rgba(8,14,27,0.8)] pl-10 pr-11 text-slate-100"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-white/6 hover:text-slate-100"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs text-slate-400 uppercase tracking-widest font-data">Demo Accounts</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={email === "admin@sau.edu" ? "bg-amber-300/10 border-amber-300/30 text-amber-200" : "bg-white/5 border-white/10 text-slate-300 font-normal"}
                  onClick={() => setEmail("admin@sau.edu")}
                >
                  Admin
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={email === "teacher@sau.edu" ? "bg-amber-300/10 border-amber-300/30 text-amber-200" : "bg-white/5 border-white/10 text-slate-300 font-normal"}
                  onClick={() => setEmail("teacher@sau.edu")}
                >
                  Teacher
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={email === "student@sau.edu" ? "bg-amber-300/10 border-amber-300/30 text-amber-200" : "bg-white/5 border-white/10 text-slate-300 font-normal"}
                  onClick={() => setEmail("student@sau.edu")}
                >
                  Student
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link href="/auth/forgot-password" className="text-sm text-slate-200 transition hover:text-white">
                Forgot password?
              </Link>
            </div>

            <Button
              className="h-11 rounded-2xl text-sm font-semibold"
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true)
                await authService.signIn(email, password)
                // Read back from localStorage — authService always writes the
                // correct identity-mapped role, regardless of backend response.
                const session = authService.getSession()
                const role = session.user?.role
                if (role === "TEACHER") {
                  router.push("/teacher-dashboard")
                } else if (role === "STUDENT") {
                  router.push("/student-dashboard")
                } else {
                  router.push(nextPath || "/dashboard")
                }
              }}
            >
              {submitting ? "Signing in..." : "Continue"}
            </Button>
          </CardContent>

          <CardFooter className="border-t border-white/8 pt-6 text-sm text-slate-400">
            Use one of the demo accounts above to enter the prototype.
          </CardFooter>
        </Card>
      </div>
    </section>
  )
}
