import { Role } from './enums'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
  avatarUrl: string | null
  isEmailVerified: boolean
}

export interface LoginResponse {
  user: AuthUser
  accessToken: string
  expiresIn: number
}

export interface JwtPayload {
  sub: string
  role: Role
}
