import { demoUser } from "@/lib/mock-data"
import { postJsonWithFallback } from "@/lib/services/api-client"
import type { SessionState } from "@/lib/types"

const SESSION_KEY = "itg-demo-session"

function readSession(): SessionState {
  if (typeof window === "undefined") {
    return { status: "loading", user: null }
  }

  const rawSession = window.localStorage.getItem(SESSION_KEY)

  if (!rawSession) {
    return { status: "unauthenticated", user: null }
  }

  try {
    return { status: "authenticated", user: JSON.parse(rawSession) }
  } catch {
    window.localStorage.removeItem(SESSION_KEY)
    return { status: "unauthenticated", user: null }
  }
}

export const authService = {
  getSession(): SessionState {
    return readSession()
  },

  async signIn(email: string, password?: string) {
    const mockRoleMap: Record<string, typeof demoUser["role"]> = {
      "superadmin@sau.edu": "SUPER_ADMIN",
      "deptadmin@sau.edu": "DEPARTMENT_ADMIN",
      "faculty@sau.edu": "FACULTY",
      "student@sau.edu": "STUDENT",
    }

    const fallbackUser = {
      ...demoUser,
      email: email || demoUser.email,
      role: mockRoleMap[email] || "SUPER_ADMIN",
      name: email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1),
    }
    const user = await postJsonWithFallback("/auth/sign-in", { email, password }, fallbackUser)

    if (typeof window !== "undefined") {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    }

    return user
  },

  async signOut() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_KEY)
    }
  },

  async requestPasswordReset(email: string) {
    return postJsonWithFallback("/auth/forgot-password", { email }, {
      ok: true,
      message: `Reset instructions queued for ${email}.`,
    })
  },
}
