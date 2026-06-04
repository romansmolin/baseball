// Legacy direct-create surface. The better-auth signup flow doesn't go
// through this — it's only used by the /api/user POST route. `name` is
// required by the underlying Prisma schema; we default to the username
// when the caller doesn't pass one explicitly (handled in the controller).
export interface CreateUserInput {
    email: string
    name: string
    username: string
    passwordHash: string | null
    provider: string | null
}

export interface UpdateUserInput {
    username?: string
    passwordHash?: string | null
    provider?: string | null
}
