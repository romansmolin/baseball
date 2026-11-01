import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../../src/generated/prisma/client'

export function createShowcaseCliDb(): PrismaClient {
    const production = process.argv.includes('--production')
    const connectionString = production ? process.env.DATABASE_URL : process.env.TEST_DATABASE_URL
    if (!connectionString) throw new Error(production ? 'DATABASE_URL is required with --production' : 'TEST_DATABASE_URL is required; use --production explicitly for the application database')
    if (!production && process.env.DATABASE_URL && connectionString === process.env.DATABASE_URL) throw new Error('TEST_DATABASE_URL must be distinct from DATABASE_URL')
    return new PrismaClient({ adapter: new PrismaPg({ connectionString }), log: ['error'] })
}
