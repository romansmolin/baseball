import { describe, expect, it } from 'vitest'
import { resolveDatabaseUrl, resolveShowcaseDatabaseUrl } from './database-url'

describe('database connection selection', () => {
    it('prefers DATABASE_URL and falls back to the storage connections', () => {
        expect(resolveDatabaseUrl({ DATABASE_URL: 'primary', STORAGE_PRISMA_DATABASE_URL: 'prisma', STORAGE_POSTGRES_URL: 'postgres' })).toBe('primary')
        expect(resolveDatabaseUrl({ STORAGE_PRISMA_DATABASE_URL: 'prisma', STORAGE_POSTGRES_URL: 'postgres' })).toBe('prisma')
        expect(resolveDatabaseUrl({ STORAGE_POSTGRES_URL: 'postgres' })).toBe('postgres')
    })
    it('requires a separate test connection even when a storage URL is configured', () => {
        expect(() => resolveShowcaseDatabaseUrl({ STORAGE_POSTGRES_URL: 'same', TEST_DATABASE_URL: 'same' }, false)).toThrow()
        expect(() => resolveShowcaseDatabaseUrl({ STORAGE_POSTGRES_URL: 'postgres://one:pw@db.example/app?sslmode=require', TEST_DATABASE_URL: 'postgres://other:pw@db.example:5432/app?sslmode=verify-full' }, false)).toThrow()
        expect(resolveShowcaseDatabaseUrl({ STORAGE_PRISMA_DATABASE_URL: 'primary', TEST_DATABASE_URL: 'test' }, false)).toBe('test')
        expect(resolveShowcaseDatabaseUrl({ STORAGE_PRISMA_DATABASE_URL: 'primary' }, true)).toBe('primary')
    })
})
