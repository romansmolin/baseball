type DatabaseEnvironment = Record<string, string | undefined>

function databaseIdentity(value: string): string {
    try {
        const url = new URL(value)
        return `${url.hostname.toLowerCase().replace(/-pooler\./, '.')}:${url.port || '5432'}${decodeURIComponent(url.pathname)}`
    } catch {
        return value
    }
}

export function resolveDatabaseUrl(env: DatabaseEnvironment = process.env): string | undefined {
    return env.DATABASE_URL || env.STORAGE_PRISMA_DATABASE_URL || env.STORAGE_POSTGRES_URL || undefined
}

export function resolveShowcaseDatabaseUrl(env: DatabaseEnvironment, production: boolean): string {
    if (production) {
        const url = resolveDatabaseUrl(env)
        if (!url) throw new Error('DATABASE_URL, STORAGE_PRISMA_DATABASE_URL or STORAGE_POSTGRES_URL is required with --production')
        return url
    }
    const url = env.TEST_DATABASE_URL
    if (!url) throw new Error('TEST_DATABASE_URL is required; use --production explicitly for the application database')
    if ([env.DATABASE_URL, env.STORAGE_PRISMA_DATABASE_URL, env.STORAGE_POSTGRES_URL].some(productionUrl => productionUrl && databaseIdentity(productionUrl) === databaseIdentity(url))) {
        throw new Error('TEST_DATABASE_URL must be distinct from every configured application database URL')
    }
    return url
}
