export const appConfig = {
  name: "TimeTable X",
  shortName: "TTX",
  institution: "South Asian University",
  description:
    "Premium academic scheduling frontend for timetable generation, conflict resolution, analytics, and versioned publishing.",
} as const

export const envConfig = {
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "https://itg-backend-837l.onrender.com/api/v1",
  supabaseUrl:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://your-project.supabase.co",
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "your-supabase-anon-key",
}

export const isApiConfigured = !!envConfig.apiBaseUrl
export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
