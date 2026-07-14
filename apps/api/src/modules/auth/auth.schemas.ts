// Thin re-export of the canonical schemas in @taskflow/types — the frontend
// imports the same objects for its react-hook-form resolvers, so validation
// never drifts between client and server. This file is the one place a
// route-only refinement would go if one were ever needed.
export {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailParamsSchema,
} from '@taskflow/types'
