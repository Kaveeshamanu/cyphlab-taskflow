import { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import multer from 'multer'
import { AppError, fail } from '../utils/envelope'

export function notFoundHandler(req: Request, res: Response): void {
  fail(res, `Route not found: ${req.method} ${req.originalUrl}`, 404)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    fail(res, err.message, err.statusCode, err.errors)
    return
  }
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
    fail(res, 'Validation failed', 422, errors)
    return
  }
  if (err instanceof multer.MulterError) {
    fail(res, `Upload failed: ${err.message}`, 422)
    return
  }
  console.error(`[${req.id}]`, err)
  fail(res, 'Internal server error', 500)
}
