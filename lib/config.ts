export const appConfig = {
  name: "Intelligent Timetable Generator",
  shortName: "ITG",
  institution: "South Asian University",
  description:
    "Premium academic scheduling frontend for timetable generation, conflict resolution, analytics, and versioned publishing.",
} as const

export const envConfig = {
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://127.0.0.1:8000/api/v1",
  supabaseUrl:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://your-project.supabase.co",
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "your-supabase-anon-key",
}

export const isApiConfigured = !!envConfig.apiBaseUrl
export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
