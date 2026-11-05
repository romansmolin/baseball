import type { PrismaClient } from '../../../src/generated/prisma/client'

const DAY_MS = 86400000

/**
 * Keeps the activity feed from growing without bound: it shows recent events, so
 * rank moves older than a day and joins or locks older than two weeks are dropped.
 */
export async function cleanupShowcase(db: PrismaClient, now = new Date()) {
    const rank = await db.communityEvent.deleteMany({ where: { kind: 'RANK_CHANGED', occurredAt: { lt: new Date(now.getTime() - DAY_MS) } } })
    const entries = await db.communityEvent.deleteMany({ where: { kind: { in: ['ENTRY_JOINED', 'LINEUP_LOCKED'] }, occurredAt: { lt: new Date(now.getTime() - 14 * DAY_MS) } } })
    return { rankEvents: rank.count, entryEvents: entries.count }
}
