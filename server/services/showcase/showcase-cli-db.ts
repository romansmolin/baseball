import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../../src/generated/prisma/client'
import { resolveShowcaseDatabaseUrl } from '../../lib/database-url'

export function createShowcaseCliDb(): PrismaClient {
    const production = process.argv.includes('--production')
    const connectionString = resolveShowcaseDatabaseUrl(process.env, production)
    return new PrismaClient({ adapter: new PrismaPg({ connectionString }), log: ['error'] })
}
