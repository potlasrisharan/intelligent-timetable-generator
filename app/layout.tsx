import type React from "react"
import type { Metadata } from "next"
import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { Toaster } from "sonner"
import { appConfig } from "@/lib/config"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: appConfig.name,
    template: `%s | ${appConfig.name}`,
  },
  description: appConfig.description,
  applicationName: appConfig.name,
  generator: "OpenAI Codex",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="antialiased">
      <body className="font-sans">
        <ClerkProvider>
          <header>
            <Show when="signed-out">
              <SignInButton />
              <SignUpButton />
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </header>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "rgba(15, 20, 35, 0.95)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#f8fafc",
                backdropFilter: "blur(20px)",
                borderRadius: "1rem",
              },
            }}
            richColors
            closeButton
          />
        </ClerkProvider>
      </body>
    </html>
  )
}
