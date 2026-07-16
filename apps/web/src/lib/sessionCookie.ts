const COOKIE_NAME = 'taskflow_session'

// The real refresh-token cookie is httpOnly and scoped to the API's own
// origin (a different port/domain from this Next.js app), so it is never
// visible to this app's server-side middleware. This marker cookie is a
// separate, non-httpOnly, non-sensitive flag set on THIS origin purely so
// middleware.ts can make a fast redirect decision before the client has
// hydrated. It carries no token and grants nothing — every API route
// re-verifies the real access token independently (see requireAuth).
export function setSessionCookie(): void {
  document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
}

export function clearSessionCookie(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`
}
