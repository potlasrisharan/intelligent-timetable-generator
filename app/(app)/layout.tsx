import type { ReactNode } from "react"
import { ProtectedApp } from "@/components/layout/protected-app"

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return <ProtectedApp>{children}</ProtectedApp>
}
