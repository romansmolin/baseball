import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../../src/generated/prisma/client'
import { resolveDatabaseUrl } from './database-url'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

const createPrismaClient = () => {
    const adapter = new PrismaPg({ connectionString: resolveDatabaseUrl() })
    return new PrismaClient({ adapter, log: ['error'] })
}

// A regenerated client may add models while Next.js retains the old development singleton.
export const prisma = globalForPrisma.prisma?.demoReportJob ? globalForPrisma.prisma : createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
