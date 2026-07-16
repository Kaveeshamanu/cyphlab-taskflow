import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse, LoginResponse } from '@taskflow/types'
import { useAuthStore } from '@/stores/authStore'
import { setSessionCookie, clearSessionCookie } from '@/lib/sessionCookie'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

// Concurrent 401s (several requests in flight when the access token expires)
// must trigger exactly one refresh call, not one per request — every
// failing request awaits this same in-flight promise instead of racing
// its own POST /auth/refresh.
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<ApiResponse<LoginResponse>>(`${API_BASE_URL}/api/v1/auth/refresh`, null, { withCredentials: true })
      .then((res) => {
        const session = res.data.data
        if (!session) return null
        useAuthStore.getState().setSession(session.user, session.accessToken)
        setSessionCookie()
        return session.accessToken
      })
      .catch(() => {
        useAuthStore.getState().clearSession()
        clearSessionCookie()
        return null
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined
    const isAuthRoute = original?.url?.includes('/auth/')

    if (!original || error.response?.status !== 401 || original._retry || isAuthRoute) {
      return Promise.reject(error)
    }

    original._retry = true
    const newToken = await refreshAccessToken()

    if (!newToken) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    original.headers.set('Authorization', `Bearer ${newToken}`)
    return api(original)
  },
)

// Every controller error path in the API returns { message, errors } inside
// the standard envelope (see apps/api/src/utils/envelope.ts) — this pulls
// the field-level message out for forms, falling back to the top-level one.
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiResponse<unknown> | undefined
    return data?.message ?? fallback
  }
  return fallback
}

export function getFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {}
  const data = error.response?.data as ApiResponse<unknown> | undefined
  const fields: Record<string, string> = {}
  data?.errors?.forEach((e) => {
    fields[e.field] = e.message
  })
  return fields
}
