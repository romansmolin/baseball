import { Prisma, type PrismaClient } from '../../../src/generated/prisma/client'
import { themedNameForGenericContest } from '../daily-contests/daily-contest-names'
import { showcaseLeaseStore } from './showcase-lease.repository'
import { withShowcaseLease } from './showcase-lease'

/**
 * Gives showcase contests that all share one name ("MLB 2026 Season Classic")
 * a themed, date-specific name, and updates the activity feed text that quotes it.
 */
export async function renameGenericContests(db: PrismaClient, input: { dryRun: boolean; now: Date }) {
    const rows = await db.dailyContest.findMany({ where: { name: { startsWith: 'MLB ' } }, select: { id: true, name: true, contestDate: true } })
    const renames = rows.flatMap(row => {
        const to = themedNameForGenericContest(row.name, row.contestDate)
        return to ? [{ id: row.id, from: row.name, to }] : []
    })
    if (input.dryRun || !renames.length) return { candidates: renames.length, renamed: 0, acquired: false }

    const lease = await withShowcaseLease(showcaseLeaseStore(db), 'showcase:tick', input.now, async () => {
        for (const { id, from, to } of renames) {
            await db.$transaction(async tx => {
                await tx.dailyContest.update({ where: { id }, data: { name: to } })
                await tx.$executeRaw(Prisma.sql`
                    UPDATE "CommunityEvent"
                    SET payload = jsonb_set(payload, '{detail}', to_jsonb(replace(payload->>'detail', ${from}, ${to})), true)
                    WHERE "contestId" = ${id}
                      AND jsonb_typeof(payload) = 'object'
                      AND payload->>'detail' LIKE ${`%${from}%`}
                `)
            })
        }
        return { candidates: renames.length, renamed: renames.length }
    })

    return lease.acquired ? { ...lease.result, acquired: true } : { candidates: renames.length, renamed: 0, acquired: false }
}
