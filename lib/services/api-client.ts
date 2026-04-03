import { envConfig } from "@/lib/config"

const REQUEST_TIMEOUT_MS = 5000

function buildApiUrl(path: string) {
  const normalizedBase = envConfig.apiBaseUrl.replace(/\/$/, "")
  const normalizedPath = path.startsWith("/") ? path : `/${path}`

  return `${normalizedBase}${normalizedPath}`
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(buildApiUrl(path), {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    })

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    return (await response.json()) as T
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function getJsonWithFallback<T>(path: string, fallbackValue: T) {
  if (!envConfig.apiBaseUrl) {
    return fallbackValue
  }

  try {
    return await requestJson<T>(path)
  } catch {
    return fallbackValue
  }
}

export async function postJsonWithFallback<TResponse>(
  path: string,
  body: unknown,
  fallbackValue: TResponse,
) {
  if (!envConfig.apiBaseUrl) {
    return fallbackValue
  }

  try {
    return await requestJson<TResponse>(path, {
      method: "POST",
      body: JSON.stringify(body),
    })
  } catch {
    return fallbackValue
  }
}
