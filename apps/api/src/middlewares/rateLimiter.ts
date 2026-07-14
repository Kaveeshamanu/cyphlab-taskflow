import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit'
import { fail } from '../utils/envelope'

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000

// Factories, not singletons: each call gets its own MemoryStore. createApp()
// calls these fresh every time it builds a router, so multiple app instances
// (one per test, or blue/green processes) never share a rate-limit counter.
export function createLoginRateLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      fail(res, 'Too many login attempts. Try again in 15 minutes.', 429)
    },
  })
}

export function createForgotPasswordRateLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      fail(res, 'Too many requests. Try again in 15 minutes.', 429)
    },
  })
}
