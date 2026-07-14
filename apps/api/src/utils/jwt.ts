import { randomUUID } from 'node:crypto'
import jwt, { SignOptions } from 'jsonwebtoken'
import { JwtPayload, Role } from '@taskflow/types'
import { env } from '../config/env'

// env values are validated by Zod but typed as a plain `string`; @types/jsonwebtoken
// wants its own branded "5m" / "7d" style literal type, so the shape is asserted
// once here rather than widening the env schema's type.
const jwtExpiresIn = env.JWT_EXPIRES_IN as SignOptions['expiresIn']
const refreshExpiresIn = env.REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn']

export function signAccessToken(payload: { sub: string; role: Role }): {
  token: string
  expiresIn: number
} {
  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: jwtExpiresIn })
  const decoded = jwt.decode(token) as { exp: number; iat: number }
  return { token, expiresIn: decoded.exp - decoded.iat }
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload
}

// The refresh token is itself a signed JWT (separate secret from the access
// token) so a tampered/garbage cookie is rejected before any DB round-trip.
// Revocation and rotation state are NOT in the JWT — the hashed row in
// RefreshToken is the actual source of truth, since a JWT can't be revoked
// on its own.
export function signRefreshToken(userId: string): { token: string; expiresAt: Date } {
  // jti makes the token unique even if issued for the same user within the
  // same iat second (e.g. rapid rotation, or logging in from two tabs at
  // once) — without it, two tokens with identical claims sign to the same
  // string and collide on RefreshToken.tokenHash's unique constraint.
  const token = jwt.sign({ sub: userId, jti: randomUUID() }, env.REFRESH_TOKEN_SECRET, {
    expiresIn: refreshExpiresIn,
  })
  const decoded = jwt.decode(token) as { exp: number }
  return { token, expiresAt: new Date(decoded.exp * 1000) }
}

export function verifyRefreshTokenSignature(token: string): { sub: string } | null {
  try {
    return jwt.verify(token, env.REFRESH_TOKEN_SECRET) as { sub: string }
  } catch {
    return null
  }
}
