import type { PrismaClient } from '../../../src/generated/prisma/client'
import { Prisma } from '../../../src/generated/prisma/client'
import { refreshManagerStandings } from '../community/manager-standings.service'

export interface PromoteSeasonShowcaseInput {
    season: number
    dryRun: boolean
    now?: Date
}

export async function promoteSeasonShowcaseToLive(db: PrismaClient, input: PromoteSeasonShowcaseInput) {
    if (!Number.isInteger(input.season) || input.season < 1876 || input.season > new Date().getUTCFullYear()) {
        throw new Error('--season must be a valid current or past MLB season')
    }

    const seasonKey = `season-${input.season}`
    const baseWhere = { leagueSlug: 'mlb', slateKey: seasonKey, status: 'COMPLETED' as const }
    const [replayContests, liveSeasonContests] = await Promise.all([
        db.dailyContest.findMany({ where: { ...baseWhere, mode: 'REPLAY' }, select: { id: true, contestDate: true, games: true } }),
        db.dailyContest.findMany({ where: { ...baseWhere, mode: 'LIVE' }, select: { id: true, contestDate: true, games: true } }),
    ])
    const contests = [...replayContests, ...liveSeasonContests]
    if (!contests.length) throw new Error(`No completed showcase contests found for season ${input.season}`)

    const contestIds = contests.map(contest => contest.id)
    const dates = [...new Set(contests.map(contest => contest.contestDate))]
    const [stats, events, otherLiveRows] = await Promise.all([
        db.$queryRaw<{ entries: bigint; managers: bigint; nonDemoEntries: bigint }[]>(Prisma.sql`
            SELECT COUNT(e.id) AS entries,
                   COUNT(DISTINCT e."userId") AS managers,
                   COUNT(e.id) FILTER (WHERE d."userId" IS NULL) AS "nonDemoEntries"
            FROM "DailyEntry" e
            LEFT JOIN "DemoProfile" d ON d."userId" = e."userId"
            WHERE e."contestId" IN (${Prisma.join(contestIds)})
        `),
        db.communityEvent.count({ where: { contestId: { in: contestIds } } }),
        db.dailyContest.findMany({
            where: { mode: 'LIVE', leagueSlug: 'mlb', slateKey: seasonKey, contestDate: { in: dates } },
            select: { id: true },
        }),
    ])
    const knownLiveIds = new Set(liveSeasonContests.map(contest => contest.id))
    const conflicts = otherLiveRows.filter(contest => !knownLiveIds.has(contest.id)).length
    const totals = stats[0]
    if (Number(totals.nonDemoEntries) > 0) throw new Error('Season showcase includes non-demo entries; refusing to change their contest mode')
    if (conflicts > 0) throw new Error(`${conflicts} LIVE contest key conflicts found; refusing to promote season showcase`)

    const summary = {
        season: input.season,
        contestsToPromote: replayContests.length,
        alreadyPromoted: liveSeasonContests.length,
        games: contests.reduce((total, contest) => total + (Array.isArray(contest.games) ? contest.games.length : 0), 0),
        entries: Number(totals.entries),
        demoManagers: Number(totals.managers),
        events,
        conflicts,
        dryRun: input.dryRun,
    }
    if (input.dryRun) return summary

    await db.dailyContest.updateMany({ where: { id: { in: replayContests.map(contest => contest.id) } }, data: { mode: 'LIVE' } })

    await refreshManagerStandings('LIVE', input.now ?? new Date(), db)
    return { ...summary, dryRun: false }
}
