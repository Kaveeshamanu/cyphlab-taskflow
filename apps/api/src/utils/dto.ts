import { Role, UserDto } from '@taskflow/types'

// Prisma generates its own nominal Role enum with identical string values to
// @taskflow/types' Role — every mapper below bridges that value-preserving
// gap with a cast rather than a runtime conversion.
interface UserRecord {
  id: string
  name: string
  email: string
  role: string
  avatarUrl: string | null
  isEmailVerified: boolean
  createdAt: Date
}

export function toUserDto(user: UserRecord): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    avatarUrl: user.avatarUrl,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt.toISOString(),
  }
}
