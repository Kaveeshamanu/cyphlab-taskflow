import { Request, Response } from 'express'
import { asyncHandler } from '../../utils/asyncHandler'
import { created, ok } from '../../utils/envelope'
import { AppError } from '../../utils/envelope'
import { REFRESH_TOKEN_COOKIE_NAME, refreshCookieOptions, clearRefreshCookieOptions } from '../../utils/cookies'
import * as authService from './auth.service'

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.register(req.body)
  created(res, user, 'Registered — check your email to verify your account')
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, expiresIn, rawRefreshToken } = await authService.login(req.body)
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, rawRefreshToken, refreshCookieOptions())
  ok(res, { user, accessToken, expiresIn }, 'Logged in')
})

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const raw = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] as string | undefined
  await authService.logout(raw)
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, clearRefreshCookieOptions())
  ok(res, null, 'Logged out')
})

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const raw = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] as string | undefined
  if (!raw) throw new AppError('Not authenticated', 401)

  try {
    const { user, accessToken, expiresIn, rawRefreshToken } = await authService.refresh(raw)
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, rawRefreshToken, refreshCookieOptions())
    ok(res, { user, accessToken, expiresIn }, 'Token refreshed')
  } catch (err) {
    // Never leave a rejected refresh cookie sitting in the browser.
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, clearRefreshCookieOptions())
    throw err
  }
})

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body.email)
  ok(res, null, 'If that email exists, a password reset link has been sent')
})

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body)
  ok(res, null, 'Password reset — please log in again')
})

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  await authService.verifyEmail(req.params.token)
  ok(res, null, 'Email verified')
})
