import type { PrismaClient } from '../../../src/generated/prisma/client'
import type { LeaseStore } from './showcase-lease'
export function showcaseLeaseStore(db: PrismaClient): LeaseStore {
    return {
        async acquire(key, token, now, expiresAt) {
            await db.showcaseJob.upsert({ where: { key }, create: { key }, update: {} })
            const result = await db.showcaseJob.updateMany({ where: { key, OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }] }, data: { leaseToken: token, leaseExpiresAt: expiresAt } })
            return result.count === 1
        },
        // Retain the expiry as a shared cooldown: another visitor cannot restart
        // the same successful or failed job immediately after the owner exits.
        async release(key, token) { await db.showcaseJob.updateMany({ where: { key, leaseToken: token }, data: { leaseToken: null } }) },
    }
}
