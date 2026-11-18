type DatabaseEnvironment = Record<string, string | undefined>

export function resolveDatabaseUrl(env: DatabaseEnvironment = process.env): string | undefined {
    return env.DATABASE_URL || env.STORAGE_PRISMA_DATABASE_URL || env.STORAGE_POSTGRES_URL || undefined
}
