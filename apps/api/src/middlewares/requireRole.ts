import { NextFunction, Request, Response } from 'express'
import { Role } from '@taskflow/types'
import { AppError } from '../utils/envelope'

// Coarse gate — reads the role already attached to req.user by requireAuth
// (itself read from the JWT payload). Zero DB calls; run this before any
// requireProjectAccess check so cheap rejections happen first.
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', 401))
      return
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError('Insufficient permissions', 403))
      return
    }
    next()
  }
}
