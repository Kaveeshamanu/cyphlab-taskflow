import { Response } from 'express'
import { ApiResponse, FieldError } from '@taskflow/types'

export function ok<T>(res: Response, data: T, message = 'OK', statusCode = 200): Response {
  const body: ApiResponse<T> = { success: true, data, message, errors: null }
  return res.status(statusCode).json(body)
}

export function created<T>(res: Response, data: T, message = 'Created'): Response {
  return ok(res, data, message, 201)
}

export function fail(
  res: Response,
  message: string,
  statusCode = 400,
  errors: FieldError[] | null = null,
): Response {
  const body: ApiResponse<null> = { success: false, data: null, message, errors }
  return res.status(statusCode).json(body)
}

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 400,
    public readonly errors: FieldError[] | null = null,
  ) {
    super(message)
    this.name = 'AppError'
  }
}
