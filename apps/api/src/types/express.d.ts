import { Role } from '@taskflow/types'

declare global {
  namespace Express {
    interface Request {
      id: string
      user?: { id: string; role: Role }
    }
  }
}

export {}
