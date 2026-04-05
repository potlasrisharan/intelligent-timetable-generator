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
    // Maps demo credentials to real identities in the seed data
    const identityMap: Record<string, Partial<typeof demoUser> & { sectionId?: string; facultyName?: string }> = {
      "admin@sau.edu": {
        role: "ADMIN",
        name: "Ayesha Rahman",
        department: "University Scheduling Office",
      },
      "teacher@sau.edu": {
        role: "TEACHER",
        name: "Prof. Sara Joseph",
        department: "Computer Science",
        facultyName: "Prof. Sara Joseph",  // exact match against timetable entries
      },
      "student@sau.edu": {
        role: "STUDENT",
        name: "Student (CSE 3A)",
        department: "Computer Science",
        sectionId: "cse-3a",               // exact match against timetable entries
      },
    }

    const identity = identityMap[email] ?? { role: "ADMIN" as const, name: email.split("@")[0] }
    const fallbackUser = { ...demoUser, email, ...identity }

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
