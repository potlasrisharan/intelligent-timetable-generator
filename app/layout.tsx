import type React from "react"
import type { Metadata } from "next"
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
      <body className="font-sans">{children}</body>
    </html>
  )
}
