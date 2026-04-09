"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, MailCheck } from "lucide-react"
import { DottedSurface } from "@/components/shared/dotted-surface"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/lib/services/auth-service"

export function ForgotPasswordCard() {
  const [email, setEmail] = useState("admin@sau.edu")
  const [message, setMessage] = useState("")

  return (
    <section className="relative min-h-screen overflow-hidden bg-background">
      <DottedSurface className="opacity-55" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(236,245,255,0.18),rgba(210,229,255,0.34))]" />
      <div className="relative z-10 grid min-h-screen place-items-center px-4">
        <Card className="glass-panel-strong section-ring w-full max-w-lg rounded-[1.8rem] border-white/50">
          <CardHeader className="space-y-3">
            <p className="font-data text-[0.72rem] uppercase tracking-[0.26em] text-[#5b7cc7]">
              Auth recovery
            </p>
            <div className="space-y-2">
              <CardTitle className="text-3xl text-[#1a1a1a]">Reset access</CardTitle>
              <CardDescription className="text-base leading-6 text-[#475569]">
                Keep the academic ops team moving by restoring access without leaving the workspace.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="reset-email" className="text-[#334155]">
                Email address
              </Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 rounded-2xl border-white/50 bg-[rgba(255,255,255,0.24)]"
              />
            </div>
            <Button
              className="h-11 rounded-2xl"
              onClick={async () => {
                const response = await authService.requestPasswordReset(email)
                setMessage(response.message)
              }}
            >
              <MailCheck className="size-4" />
              Send reset instructions
            </Button>
            {message ? (
              <div className="rounded-[1.2rem] border border-emerald-400/30 bg-emerald-400/12 px-4 py-3 text-sm text-[#166534]">
                {message}
              </div>
            ) : null}
            <Button asChild variant="outline" className="rounded-2xl border-white/45 bg-[rgba(255,255,255,0.18)] text-[#1a1a1a]">
              <Link href="/auth/login">
                <ArrowLeft className="size-4" />
                Back to sign in
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
