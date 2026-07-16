import { create } from 'zustand'
import type { AuthUser } from '@taskflow/types'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  setSession: (user: AuthUser, accessToken: string) => void
  clearSession: () => void
}

// Access token lives here — in memory only, never localStorage/sessionStorage
// — so it's unreadable to any XSS payload that doesn't already have direct
// JS execution in this exact page context. The refresh token is the other
// half of the threat model: an httpOnly cookie this store never touches.
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setSession: (user, accessToken) => set({ user, accessToken }),
  clearSession: () => set({ user: null, accessToken: null }),
}))
