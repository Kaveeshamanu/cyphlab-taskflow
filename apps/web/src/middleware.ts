import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'taskflow_session'
const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email']

// UX-only redirect, not a security boundary: the real refresh-token cookie
// is httpOnly and scoped to the API's own cross-origin domain, so it's
// invisible here. This just reads the lightweight marker cookie set by
// lib/sessionCookie.ts client-side after a successful login/refresh, to
// avoid a flash of protected content before the client hydrates. Every API
// route independently re-verifies the real access token (requireAuth).
export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE)
  const { pathname } = request.nextUrl
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path))

  if (!hasSession && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  if (hasSession && isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
