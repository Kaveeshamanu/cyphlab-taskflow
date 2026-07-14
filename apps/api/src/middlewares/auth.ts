import { NextFunction, Request, Response } from 'express'
import { AppError } from '../utils/envelope'
import { verifyAccessToken } from '../utils/jwt'
import { runWithActor } from '../utils/actorContext'

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    next(new AppError('Authentication required', 401))
    return
  }

  try {
    const payload = verifyAccessToken(header.slice(7))
    req.user = { id: payload.sub, role: payload.role }
    runWithActor(payload.sub, () => next())
  } catch {
    next(new AppError('Invalid or expired access token', 401))
  }
}
