import { CookieOptions } from 'express'
import { env } from '../config/env'

export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken'
const REFRESH_TOKEN_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

// SameSite=None (cross-site Vercel <-> Render in prod) requires Secure, and
// Partitioned (CHIPS) so the cookie survives third-party cookie phase-out.
// SameSite=Lax in dev/Docker is same-origin, so neither is needed there.
export function refreshCookieOptions(): CookieOptions {
  const sameSite = env.COOKIE_SAMESITE.toLowerCase() as 'strict' | 'lax' | 'none'
  const isCrossSite = sameSite === 'none'

  return {
    httpOnly: true,
    secure: isCrossSite || env.NODE_ENV === 'production',
    sameSite,
    path: '/api/v1/auth',
    maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
    ...(isCrossSite ? { partitioned: true } : {}),
  }
}

export function clearRefreshCookieOptions(): CookieOptions {
  const options = refreshCookieOptions()
  return { ...options, maxAge: undefined }
}
