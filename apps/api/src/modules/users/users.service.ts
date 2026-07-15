import { hash } from '@node-rs/argon2'
import type { CreateUserInput, ListUsersQuery, UpdateUserInput, UpdateUserRoleInput, UserDto } from '@taskflow/types'
import { prisma } from '../../db/client'
import { AppError } from '../../utils/envelope'
import { buildMeta, toSkipTake } from '../../utils/pagination'
import { toUserDto } from '../../utils/dto'

async function assertEmailAvailable(email: string, excludeUserId?: string): Promise<void> {
  const existing = await prisma.user.findFirst({ where: { email }, select: { id: true } })
  if (existing && existing.id !== excludeUserId) {
    throw new AppError('Email already registered', 409, [
      { field: 'email', message: 'Email already registered' },
    ])
  }
}

export async function list(query: ListUsersQuery): Promise<{ data: UserDto[]; total: number }> {
  const { skip, take } = toSkipTake(query.page, query.limit)
  const where = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { email: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ])

  return { data: users.map(toUserDto), total }
}

export function paginationMeta(query: ListUsersQuery, total: number) {
  return buildMeta(query.page, query.limit, total)
}

export async function create(input: CreateUserInput): Promise<UserDto> {
  await assertEmailAvailable(input.email)
  const passwordHash = await hash(input.password)
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      isEmailVerified: true, // admin-created accounts skip the email verification loop
    },
  })
  return toUserDto(user)
}

export async function update(id: string, input: UpdateUserInput): Promise<UserDto> {
  const existing = await prisma.user.findFirst({ where: { id } })
  if (!existing) throw new AppError('User not found', 404)

  if (input.email && input.email !== existing.email) {
    await assertEmailAvailable(input.email, id)
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
    },
  })
  return toUserDto(user)
}

export async function updateRole(id: string, input: UpdateUserRoleInput): Promise<UserDto> {
  const existing = await prisma.user.findFirst({ where: { id } })
  if (!existing) throw new AppError('User not found', 404)

  const user = await prisma.user.update({ where: { id }, data: { role: input.role } })
  return toUserDto(user)
}

export async function softDelete(id: string): Promise<void> {
  const existing = await prisma.user.findFirst({ where: { id } })
  if (!existing) throw new AppError('User not found', 404)

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { deletedAt: new Date() } }),
    prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ])
}
