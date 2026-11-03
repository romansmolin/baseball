import type { PrismaClient } from '../../../src/generated/prisma/client'
import { showcaseLeaseStore } from './showcase-lease.repository'
import { withShowcaseLease } from './showcase-lease'

export async function retireOpenReplays(db: PrismaClient, input: { dryRun: boolean; now: Date }) {
    const where = { mode: 'REPLAY' as const, status: { in: ['OPEN', 'LOCKED'] as ('OPEN' | 'LOCKED')[] } }
    if (input.dryRun) {
        const candidates = await db.dailyContest.count({ where })
        return { candidates, cancelled: 0, acquired: false }
    }

    const lease = await withShowcaseLease(showcaseLeaseStore(db), 'showcase:tick', input.now, async () => {
        const candidates = await db.dailyContest.count({ where })
        const result = await db.dailyContest.updateMany({ where, data: { status: 'CANCELLED' } })
        return { candidates, cancelled: result.count }
    })

    return lease.acquired ? { ...lease.result, acquired: true } : { candidates: 0, cancelled: 0, acquired: false }
}
