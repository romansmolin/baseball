import { randomUUID } from 'node:crypto'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../../src/generated/prisma/client'
import { describe, expect, it } from 'vitest'
import { seedShowcaseHistory } from './showcase-history.service'

describe.skipIf(!process.env.TEST_DATABASE_URL)('showcase replay history on PostgreSQL', () => {
    it('creates one batch of real-score entries and resumes without duplicates', async () => {
        const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL }) })
        const seed = randomUUID()
        const users = await Promise.all(Array.from({ length: 3 }, (_, ordinal) => db.user.create({ data: { email: `${seed}-${ordinal}@managers.invalid`, name: `Manager ${ordinal}`, provider: 'demo', demoProfile: { create: { demoKey: `${seed}-${ordinal}`, countryCode: 'US', favoriteTeamId: 119, strategy: 'BALANCED', datasetSeed: seed, ordinal } } } })))
        const existingRule = await db.scoringRule.findFirst({ where: { isDefault: true } })
        const rule = existingRule ?? await db.scoringRule.create({ data: { name: `test-${seed}`, isDefault: true, rules: { single: 3, double: 5, triple: 8, homeRun: 10, rbi: 2, runScored: 2, stolenBase: 5, walk: 2, strikeoutBatter: -1, inningPitched: 2.25, strikeoutPitcher: 2, win: 4, earnedRunAllowed: -2 } } })
        const now = new Date('2023-03-17T12:00:00Z')
        const players = (['P', 'C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF'] as const).map((position, index) => ({ externalPlayerId: index + 1, position, name: `Player ${index + 1}`, teamId: 1, teamName: 'Team', salary: 5000, photoUrl: null }))
        const box = { gamePk: 19700101, status: 'FINAL' as const, batters: [{ externalPlayerId: 1, hits: 1, doubles: 0, triples: 0, homeRuns: 0, rbi: 0, runs: 0, stolenBases: 0, baseOnBalls: 0, strikeOuts: 0 }], pitchers: [] }
        const archive = async () => [{ sourceDate: '2025-07-01', games: [{ gamePk: box.gamePk, gameDateUtc: '2025-07-01T19:00:00Z', homeTeamId: 1, awayTeamId: 2, homeTeamName: 'Home', awayTeamName: 'Away', status: 'FINAL' as const, homeScore: 1, awayScore: 0, doubleHeader: false }], players, boxScores: [box] }]
        try {
            const result = await seedShowcaseHistory(db, { days: 1, participantsPerDay: 3, seed, dryRun: false, now }, archive)
            expect(result.entries).toBe(3)
            const entries = await db.dailyEntry.findMany({ where: { userId: { in: users.map(u => u.id) } } })
            expect(entries).toHaveLength(3)
            expect(entries.every(entry => entry.isFinal)).toBe(true)
            expect((await seedShowcaseHistory(db, { days: 1, participantsPerDay: 3, seed, dryRun: false, now }, archive)).entries).toBe(0)
        } finally {
            const ids = users.map(user => user.id)
            const contests = await db.dailyContest.findMany({ where: { mode: 'REPLAY', contestDate: '2023-03-16' }, select: { id: true } })
            const contestIds = contests.map(contest => contest.id)
            await db.communityEvent.deleteMany({ where: { OR: [{ userId: { in: ids } }, { contestId: { in: contestIds } }] } })
            await db.managerStanding.deleteMany({ where: { userId: { in: ids } } })
            await db.dailyEntry.deleteMany({ where: { userId: { in: ids } } })
            await db.dailyContest.deleteMany({ where: { id: { in: contestIds } } })
            await db.demoProfile.deleteMany({ where: { userId: { in: ids } } })
            await db.user.deleteMany({ where: { id: { in: ids } } })
            if (!existingRule) await db.scoringRule.delete({ where: { id: rule.id } })
            await db.$disconnect()
        }
    }, 30000)
})
