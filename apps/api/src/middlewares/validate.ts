import { NextFunction, Request, Response } from 'express'
import { ZodError, ZodTypeAny } from 'zod'
import { fail } from '../utils/envelope'

interface ValidationSchemas {
  // ZodTypeAny (not AnyZodObject) — moveTaskSchema wraps its ZodObject in
  // .refine(), which returns a ZodEffects, not a ZodObject.
  body?: ZodTypeAny
  query?: ZodTypeAny
  params?: ZodTypeAny
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
