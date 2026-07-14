import { Router } from 'express'
import { validate } from '../../middlewares/validate'
import { createLoginRateLimiter, createForgotPasswordRateLimiter } from '../../middlewares/rateLimiter'
import * as schemas from './auth.schemas'
import * as controller from './auth.controller'

// A factory, not a module-level singleton — createApp() calls this once per
// app instance, which also gives each app its own rate-limiter counters
// (see middlewares/rateLimiter.ts) instead of one shared across every app
// built in the process (e.g. one per test).
export function createAuthRouter(): Router {
  const router = Router()
  const loginRateLimiter = createLoginRateLimiter()
  const forgotPasswordRateLimiter = createForgotPasswordRateLimiter()

  /**
   * @openapi
   * /auth/register:
   *   post:
   *     tags: [Auth]
   *     summary: Register a new account
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, email, password]
   *             properties:
   *               name: { type: string, example: Jordan Lee }
   *               email: { type: string, format: email }
   *               password: { type: string, format: password, description: "Min 8 chars, upper+lower+number" }
   *     responses:
   *       201: { description: Registered — verification email sent }
   *       409: { description: Email already registered }
   *       422: { description: Validation failed }
   */
  router.post('/register', validate({ body: schemas.registerSchema }), controller.register)

  /**
   * @openapi
   * /auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Log in and receive an access token; refresh token is set as an httpOnly cookie
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email: { type: string, format: email }
   *               password: { type: string, format: password }
   *     responses:
   *       200: { description: Logged in }
   *       401: { description: Invalid email or password }
   *       422: { description: Validation failed }
   *       429: { description: Too many attempts — rate limited }
   */
  router.post('/login', loginRateLimiter, validate({ body: schemas.loginSchema }), controller.login)

  /**
   * @openapi
   * /auth/logout:
   *   post:
   *     tags: [Auth]
   *     summary: Revoke the current refresh token and clear the cookie
   *     responses:
   *       200: { description: Logged out }
   */
  router.post('/logout', controller.logout)

  /**
   * @openapi
   * /auth/refresh:
   *   post:
   *     tags: [Auth]
   *     summary: Rotate the refresh token cookie and issue a new access token
   *     description: Reuse of an already-rotated refresh token revokes every session for that user.
   *     responses:
   *       200: { description: Token refreshed }
   *       401: { description: Missing, invalid, expired, or reused refresh token }
   */
  router.post('/refresh', controller.refresh)

  /**
   * @openapi
   * /auth/forgot-password:
   *   post:
   *     tags: [Auth]
   *     summary: Request a password reset email
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email]
   *             properties:
   *               email: { type: string, format: email }
   *     responses:
   *       200: { description: "Generic success — does not confirm whether the email is registered" }
   *       422: { description: Validation failed }
   *       429: { description: Too many attempts — rate limited }
   */
  router.post(
    '/forgot-password',
    forgotPasswordRateLimiter,
    validate({ body: schemas.forgotPasswordSchema }),
    controller.forgotPassword,
  )

  /**
   * @openapi
   * /auth/reset-password:
   *   post:
   *     tags: [Auth]
   *     summary: Reset password using the token emailed by forgot-password
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [token, password]
   *             properties:
   *               token: { type: string }
   *               password: { type: string, format: password }
   *     responses:
   *       200: { description: Password reset — all sessions revoked }
   *       400: { description: Invalid or expired reset token }
   *       422: { description: Validation failed }
   */
  router.post('/reset-password', validate({ body: schemas.resetPasswordSchema }), controller.resetPassword)

  /**
   * @openapi
   * /auth/verify-email/{token}:
   *   get:
   *     tags: [Auth]
   *     summary: Verify an email address using the token emailed at registration
   *     parameters:
   *       - in: path
   *         name: token
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Email verified }
   *       400: { description: Invalid or expired verification token }
   */
  router.get('/verify-email/:token', validate({ params: schemas.verifyEmailParamsSchema }), controller.verifyEmail)

  return router
}
