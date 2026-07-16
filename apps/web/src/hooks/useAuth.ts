import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type {
  ApiResponse,
  AuthUser,
  ForgotPasswordInput,
  LoginInput,
  LoginResponse,
  RegisterInput,
  ResetPasswordInput,
} from '@taskflow/types'
import { api, getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { setSessionCookie, clearSessionCookie } from '@/lib/sessionCookie'

async function fetchSession(): Promise<LoginResponse | null> {
  try {
    const res = await api.post<ApiResponse<LoginResponse>>('/auth/refresh')
    return res.data.data
  } catch {
    return null
  }
}

// Runs once per app load: the access token lives in memory only, so a full
// page reload loses it — this silently exchanges the (still-live) httpOnly
// refresh cookie for a fresh access token before any protected page renders.
export function useSessionHydration() {
  const setSession = useAuthStore((s) => s.setSession)
  const clearSession = useAuthStore((s) => s.clearSession)

  return useQuery({
    queryKey: ['session-hydration'],
    queryFn: async () => {
      const session = await fetchSession()
      if (session) {
        setSession(session.user, session.accessToken)
        setSessionCookie()
      } else {
        clearSession()
        clearSessionCookie()
      }
      return session
    },
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useAuth() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const setSession = useAuthStore((s) => s.setSession)
  const clearSession = useAuthStore((s) => s.clearSession)

  const login = useMutation({
    mutationFn: (input: LoginInput) => api.post<ApiResponse<LoginResponse>>('/auth/login', input),
    onSuccess: (res) => {
      const session = res.data.data
      if (!session) return
      setSession(session.user, session.accessToken)
      setSessionCookie()
      toast.success('Welcome back')
      router.push('/dashboard')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Invalid email or password')),
  })

  const register = useMutation({
    mutationFn: (input: RegisterInput) => api.post<ApiResponse<AuthUser>>('/auth/register', input),
    onSuccess: () => {
      toast.success('Account created — check your email to verify it')
      router.push('/login')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not create account')),
  })

  const forgotPassword = useMutation({
    mutationFn: (input: ForgotPasswordInput) => api.post('/auth/forgot-password', input),
    onSuccess: () => toast.success('If that email exists, a reset link has been sent'),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const resetPassword = useMutation({
    mutationFn: (input: ResetPasswordInput) => api.post('/auth/reset-password', input),
    onSuccess: () => {
      toast.success('Password reset — please log in again')
      router.push('/login')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Invalid or expired reset link')),
  })

  const logout = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      clearSession()
      clearSessionCookie()
      queryClient.clear()
      router.push('/login')
    },
  })

  return { user, login, register, forgotPassword, resetPassword, logout }
}
