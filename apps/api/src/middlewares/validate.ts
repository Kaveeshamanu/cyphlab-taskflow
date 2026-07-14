import { NextFunction, Request, Response } from 'express'
import { AnyZodObject, ZodError } from 'zod'
import { fail } from '../utils/envelope'

interface ValidationSchemas {
  body?: AnyZodObject
  query?: AnyZodObject
  params?: AnyZodObject
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body)
      if (schemas.query) req.query = schemas.query.parse(req.query) as typeof req.query
      if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
        fail(res, 'Validation failed', 422, errors)
        return
      }
      next(err)
    }
  }
}
