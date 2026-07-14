import { Role } from '@taskflow/types'
import type { RegisterInput, LoginInput, ResetPasswordInput } from '@taskflow/types'
import type { Role as PrismaRole } from '@prisma/client'
import { hash, verify } from '@node-rs/argon2'
import { prisma } from '../../db/client'
import { AppError } from '../../utils/envelope'
import { signAccessToken, signRefreshToken, verifyRefreshTokenSignature } from '../../utils/jwt'
import { generateOpaqueToken, sha256 } from '../../utils/tokens'
import { sendVerifyEmail, sendPasswordResetEmail } from '../../services/email/email.service'
import { env } from '../../config/env'

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000
const GENERIC_LOGIN_ERROR = 'Invalid email or password'

interface SafeUser {
  id: string
  name: string
  email: string
  role: Role
  avatarUrl: string | null
  isEmailVerified: boolean
}

// Anything with a `.refreshToken` delegate shaped like Prisma's — satisfied
// by both the top-level client and an interactive transaction's `tx`, so
// issueSession can be called either standalone (login) or as part of a
// larger atomic transaction (refresh).
type RefreshTokenWriter = Pick<typeof prisma, 'refreshToken'>

function toAuthUser(user: {
  id: string
  name: string
  email: string
  role: PrismaRole
  avatarUrl: string | null
  isEmailVerified: boolean
}): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    // Prisma generates its own nominal Role enum with identical string values
    // to @taskflow/types' Role — the cast is a value-preserving type bridge
    // between the two, not a runtime conversion.
    role: user.role as unknown as Role,
    avatarUrl: user.avatarUrl,
    isEmailVerified: user.isEmailVerified,
  }
}

function clientOrigin(): string {
  return env.CLIENT_URL.split(',')[0].trim()
}

async function issueSession(client: RefreshTokenWriter, userId: string, role: PrismaRole) {
  const { token: accessToken, expiresIn } = signAccessToken({ sub: userId, role: role as unknown as Role })
  const { token: rawRefreshToken, expiresAt } = signRefreshToken(userId)
  await client.refreshToken.create({
    data: { tokenHash: sha256(rawRefreshToken), userId, expiresAt },
  })
  return { accessToken, expiresIn, rawRefreshToken }
}

export async function register(input: RegisterInput): Promise<SafeUser> {
  const existing = await prisma.user.findFirst({ where: { email: input.email, deletedAt: null } })
  if (existing) {
    throw new AppError('Email already registered', 409, [
      { field: 'email', message: 'Email already registered' },
    ])
  }

  const passwordHash = await hash(input.password)
  const rawVerifyToken = generateOpaqueToken()

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: Role.TEAM_MEMBER,
      emailVerifyToken: sha256(rawVerifyToken),
    },
  })

  await sendVerifyEmail(user.email, user.name, `${clientOrigin()}/verify-email/${rawVerifyToken}`)

  return toAuthUser(user)
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findFirst({ where: { email: input.email, deletedAt: null } })
  if (!user) throw new AppError(GENERIC_LOGIN_ERROR, 401)

  const validPassword = await verify(user.passwordHash, input.password)
  if (!validPassword) throw new AppError(GENERIC_LOGIN_ERROR, 401)

  // Checked after the password so an unauthenticated guesser can't use this
  // response to learn an account's verification status — only someone who
  // already knows the password gets that information.
  if (!user.isEmailVerified) {
    throw new AppError('Please verify your email before logging in', 403)
  }

  const session = await issueSession(prisma, user.id, user.role)
  return { user: toAuthUser(user), ...session }
}

export async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) return
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(rawRefreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export async function refresh(rawRefreshToken: string) {
  if (!verifyRefreshTokenSignature(rawRefreshToken)) {
    throw new AppError('Invalid refresh token', 401)
  }

  const tokenHash = sha256(rawRefreshToken)
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } })
  if (!existing) throw new AppError('Invalid refresh token', 401)

  if (existing.revokedAt) {
    // Reuse of an already-rotated token — the cookie was likely stolen and
    // used after the legitimate client rotated past it. Kill every session
    // for this user rather than just this one token.
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    throw new AppError('Refresh token reuse detected — all sessions revoked', 401)
  }

  if (existing.expiresAt < new Date()) throw new AppError('Refresh token expired', 401)

  const user = await prisma.user.findFirst({ where: { id: existing.userId, deletedAt: null } })
  if (!user) throw new AppError('User not found', 401)

  // Revoking the old token and issuing its replacement must succeed or fail
  // together — if issueSession threw after the revoke committed on its own,
  // the user would be left with a dead token and no replacement, locked out
  // with no recovery path.
  const session = await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date() } })
    return issueSession(tx, user.id, user.role)
  })

  return { user: toAuthUser(user), ...session }
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findFirst({ where: { email, deletedAt: null } })
  if (!user) return // never confirm/deny whether an email is registered

  const rawToken = generateOpaqueToken()
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: sha256(rawToken),
      passwordResetExpiry: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  })

  await sendPasswordResetEmail(user.email, user.name, `${clientOrigin()}/reset-password/${rawToken}`)
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const tokenHash = sha256(input.token)
  const passwordHash = await hash(input.password)

  await prisma.$transaction(async (tx) => {
    // Read-then-write is only safe here because the write below re-checks
    // the token in its WHERE clause: two concurrent requests can both read
    // the same candidate row, but Postgres serializes the two UPDATEs on
    // that row, and the loser's WHERE no longer matches once the winner's
    // UPDATE has cleared the token — so at most one request ever proceeds
    // past the count check.
    const candidate = await tx.user.findFirst({
      where: { passwordResetToken: tokenHash, deletedAt: null },
      select: { id: true },
    })
    if (!candidate) throw new AppError('Invalid or expired reset token', 400)

    const { count } = await tx.user.updateMany({
      where: {
        id: candidate.id,
        passwordResetToken: tokenHash,
        passwordResetExpiry: { gt: new Date() },
        deletedAt: null,
      },
      data: { passwordHash, passwordResetToken: null, passwordResetExpiry: null },
    })
    if (count !== 1) throw new AppError('Invalid or expired reset token', 400)

    // Force re-login on every device once the password changes.
    await tx.refreshToken.updateMany({
      where: { userId: candidate.id, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  })
}

export async function verifyEmail(token: string): Promise<void> {
  const tokenHash = sha256(token)
  const { count } = await prisma.user.updateMany({
    where: { emailVerifyToken: tokenHash, deletedAt: null },
    data: { isEmailVerified: true, emailVerifyToken: null },
  })
  if (count !== 1) throw new AppError('Invalid or expired verification token', 400)
}
