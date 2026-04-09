import { demoUser } from "@/lib/mock-data"
import type { SessionState, UserRole } from "@/lib/types"

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

  /**
   * Sets the demo role in local storage based on the selection, merging it with the
   * real Clerk user identity (name, email) for display purposes.
   */
  setClerkDemoRole(clerkUser: { fullName?: string | null; primaryEmail?: string | null }, role: UserRole) {
    // Maps roles to specific fake identifiers needed by the codebase
    const roleMap: Record<UserRole, Partial<typeof demoUser> & { sectionId?: string; facultyName?: string }> = {
      ADMIN: {
        role: "ADMIN",
        department: "University Scheduling Office",
      },
      TEACHER: {
        role: "TEACHER",
        department: "Computer Science",
        facultyName: "Prof. Sara Joseph", // matches the seed data
      },
      STUDENT: {
        role: "STUDENT",
        department: "Computer Science",
        sectionId: "cse-3a", // matches the seed data
      },
    }

    const email = clerkUser.primaryEmail || "demo@sau.edu"
    const name = clerkUser.fullName || email.split("@")[0]
    
    const fallbackUser = {
      ...demoUser,
      email,
      name,
      ...roleMap[role]
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(fallbackUser))
    }

    return fallbackUser
  },

  signOutLocally() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_KEY)
    }
  },
}
