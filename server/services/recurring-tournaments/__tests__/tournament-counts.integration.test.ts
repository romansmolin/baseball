import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('../../../lib/prisma', async () => {
    const { PrismaClient } = await import('../../../../src/generated/prisma/client')
    const { PrismaPg } = await import('@prisma/adapter-pg')
    const { resolveShowcaseDatabaseUrl } = await import('../../../lib/database-url')
    const connectionString = process.env.TEST_DATABASE_URL ? resolveShowcaseDatabaseUrl(process.env, false) : 'postgresql://unused:unused@127.0.0.1:9/unused'
    return { prisma: new PrismaClient({ adapter: new PrismaPg({ connectionString }) }) }
})

import { prisma } from '../../../lib/prisma'
import { TournamentsRepository } from '../../../repositories/tournaments/tournaments.repository'
import { TournamentsService } from '../../tournaments/tournaments.service'
import { mapTournamentsListToResponse } from '../../../../src/entities/tournaments/api/map-tournaments'
import { createTestDb, createTestOwner, removeTestOwner } from './test-db'

describe.skipIf(!process.env.TEST_DATABASE_URL)('tournament league counts', () => {
    const db = process.env.TEST_DATABASE_URL ? createTestDb() : null!
    let owner: Awaited<ReturnType<typeof createTestOwner>>
    let leagueA: string, leagueB: string
    beforeAll(async () => {
        owner = await createTestOwner(db)
        leagueA = `${owner.user.id}-a`; leagueB = `${owner.user.id}-b`
        const rows = [leagueA, leagueA, leagueB, leagueB, leagueB].map((leagueSlug, index) => ({ commissionerId: owner.user.id, scoringRuleId: owner.rule.id, inviteCode: `${owner.user.id}-count-${index}`, name: `Tournament ${index}`, leagueSlug, status: index === 4 ? 'IN_SEASON' as const : 'DRAFTING' as const, draftType: 'AUTO' as const, visibility: 'PUBLIC' as const, externalSeasonId: 2026, startsAt: new Date('2095-01-01'), endsAt: new Date('2095-01-08'), totalWeeks: 1 }))
        await db.league.createMany({ data: rows })
    })
    afterAll(async () => { if (owner) await removeTestOwner(db, owner.user.id); await Promise.all([db.$disconnect(), prisma.$disconnect()]) })
    it('returns counts for every league even when a different league is selected and results are paginated', async () => {
        const service = new TournamentsService(new TournamentsRepository(), {} as never, {} as never)
        const result = await service.listTournaments({ leagueSlug: leagueA, status: ['DRAFTING'], visibility: ['PUBLIC'], limit: 1, offset: 0 })
        expect(result.items).toHaveLength(1)
        expect(result.total).toBe(2)
        expect(result.leagueCounts?.[leagueA]).toBe(2)
        expect(result.leagueCounts?.[leagueB]).toBe(2)
        expect(mapTournamentsListToResponse(result).leagueCounts?.[leagueB]).toBe(2)

        const switched = await service.listTournaments({ leagueSlug: leagueB, status: ['DRAFTING'], visibility: ['PUBLIC'], limit: 1, offset: 1 })
        expect(switched.items).toHaveLength(1)
        expect(switched.leagueCounts?.[leagueA]).toBe(2)
        expect(switched.leagueCounts?.[leagueB]).toBe(2)
    })
})
