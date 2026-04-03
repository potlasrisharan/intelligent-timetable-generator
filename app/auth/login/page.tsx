import { LoginCardSection } from "@/components/auth/login-card-section"

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  const nextParam = resolvedSearchParams?.next
  const nextPath = Array.isArray(nextParam) ? nextParam[0] : nextParam

  return <LoginCardSection nextPath={nextPath || "/dashboard"} />
}
