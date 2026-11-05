import { PrismaClient } from '../../../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { afterAll, describe, expect, it } from 'vitest'
import { resolveShowcaseDatabaseUrl } from '../../lib/database-url'
import { cleanupShowcase } from './showcase-cleanup'

describe.skipIf(!process.env.TEST_DATABASE_URL)('showcase cleanup', () => {
    const db = process.env.TEST_DATABASE_URL ? new PrismaClient({ adapter: new PrismaPg({ connectionString: resolveShowcaseDatabaseUrl(process.env, false) }) }) : null!
    const prefix = `cleanup-itest-${Date.now()}`
    const now = new Date('2031-06-15T12:00:00Z')
    afterAll(async () => { await db.communityEvent.deleteMany({ where: { sourceKey: { startsWith: prefix } } }); await db.$disconnect() })

    it('drops old rank moves and old joins but keeps recent events and finished contests', async () => {
        const at = (days: number) => new Date(now.getTime() - days * 86400000)
        const row = (name: string, kind: string, days: number) => ({ sourceKey: `${prefix}:${name}`, kind, occurredAt: at(days), payload: {} })
        await db.communityEvent.createMany({ data: [row('rank-old', 'RANK_CHANGED', 2), row('rank-new', 'RANK_CHANGED', 0.5), row('join-old', 'ENTRY_JOINED', 20), row('join-new', 'ENTRY_JOINED', 3), row('done-old', 'CONTEST_COMPLETED', 90)] })
        await cleanupShowcase(db, now)
        const left = (await db.communityEvent.findMany({ where: { sourceKey: { startsWith: prefix } }, select: { sourceKey: true } })).map(event => event.sourceKey.slice(prefix.length + 1)).sort()
        expect(left).toEqual(['done-old', 'join-new', 'rank-new'])
    })
})
