import { randomUUID } from 'node:crypto'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../../../src/generated/prisma/client'
import { resolveShowcaseDatabaseUrl } from '../../../lib/database-url'

export function createTestDb(options: { readOnly?: boolean } = {}) {
    const url = new URL(resolveShowcaseDatabaseUrl(process.env, false))
    if (options.readOnly) url.searchParams.set('options', '-c default_transaction_read_only=on')
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) })
}

export const scoringRules = {
    single: 3, double: 5, triple: 8, homeRun: 10, rbi: 2, runScored: 2,
    stolenBase: 5, walk: 2, strikeoutBatter: -1, inningPitched: 3,
    strikeoutPitcher: 2, win: 5, earnedRunAllowed: -2,
}

export async function createTestOwner(db: PrismaClient) {
    const id = `recurring-test-${randomUUID()}`
    const user = await db.user.create({ data: { id, name: 'Test Manager', email: `${id}@managers.invalid`, provider: 'demo' } })
    const rule = await db.scoringRule.create({ data: { name: id, rules: scoringRules } })
    return { user, rule }
}

export async function removeTestOwner(db: PrismaClient, userId: string) {
    const leagues = await db.league.findMany({ where: { commissionerId: userId }, select: { id: true } })
    await db.creditTransaction.deleteMany({ where: { userId } })
    await db.league.deleteMany({ where: { id: { in: leagues.map(row => row.id) } } })
    await db.scoringRule.deleteMany({ where: { name: userId } })
    await db.user.deleteMany({ where: { id: userId } })
}
