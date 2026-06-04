// Mirrors the Prisma `User` row shape so repository methods can return rows
// directly without per-field copies. `username` is nullable because the
// better-auth signup path stores name+email but no username; the legacy
// /api/user route still creates rows with username populated.

import type { UserRole, UserStatus } from '../../../src/generated/prisma/enums'

export interface UserModel {
    id: string
    email: string
    name: string
    emailVerified: boolean
    image: string | null
    username: string | null
    passwordHash: string | null
    provider: string | null
    role: UserRole
    status: UserStatus
    createdAt: Date
    updatedAt: Date
}
