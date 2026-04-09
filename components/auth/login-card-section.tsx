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
        <Card className="glass-panel-strong section-ring w-full max-w-md rounded-[1.8rem] border-white/45">
          <CardHeader className="space-y-3">
            <div className="space-y-2">
              <CardTitle className="text-3xl text-[#1a1a1a]">Welcome back</CardTitle>
              <CardDescription className="text-base leading-6 text-[#43546d]">
                Sign in to access your timetable workspace.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-[#43546d]">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6a7c98]" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="border-white/45 bg-[rgba(255,255,255,0.18)] pl-10 text-[#1a1a1a]"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password" className="text-[#43546d]">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6a7c98]" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="border-white/45 bg-[rgba(255,255,255,0.18)] pl-10 pr-11 text-[#1a1a1a]"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 rounded-full border border-white/25 p-2 text-[#50627c] transition hover:bg-[rgba(255,255,255,0.22)] hover:text-[#1a1a1a]"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs text-[#5c6f8d] uppercase tracking-widest font-data">Demo Accounts</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={email === "admin@sau.edu" ? "bg-[rgba(255,214,115,0.28)] border-white/50 text-[#715615]" : "bg-[rgba(255,255,255,0.16)] border-white/45 text-[#43546d] font-normal"}
                  onClick={() => setEmail("admin@sau.edu")}
                >
                  Admin
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={email === "teacher@sau.edu" ? "bg-[rgba(255,214,115,0.28)] border-white/50 text-[#715615]" : "bg-[rgba(255,255,255,0.16)] border-white/45 text-[#43546d] font-normal"}
                  onClick={() => setEmail("teacher@sau.edu")}
                >
                  Teacher
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={email === "student@sau.edu" ? "bg-[rgba(255,214,115,0.28)] border-white/50 text-[#715615]" : "bg-[rgba(255,255,255,0.16)] border-white/45 text-[#43546d] font-normal"}
                  onClick={() => setEmail("student@sau.edu")}
                >
                  Student
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link href="/auth/forgot-password" className="text-sm text-[#43546d] transition hover:text-[#1a1a1a]">
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

          <CardFooter className="border-t border-white/35 pt-6 text-sm text-[#5c6f8d]">
            Use one of the demo accounts above to enter the prototype.
          </CardFooter>
        </Card>
      </div>
    </section>
  )
}
