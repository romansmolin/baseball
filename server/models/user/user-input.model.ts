export interface CreateUserInput {
    email: string
    username: string
    passwordHash: string | null
    provider: string | null
}

export interface UpdateUserInput {
    username?: string
    passwordHash?: string | null
    provider?: string | null
}
