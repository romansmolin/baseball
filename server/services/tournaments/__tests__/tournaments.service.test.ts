import { describe, expect, it, vi } from 'vitest'

import { LeagueStatus } from '../../../../src/generated/prisma/enums'
import { TournamentsService } from '../tournaments.service'

describe('TournamentsService.getTournamentStandings', () => {
    it('reads materialized totals without running scoring or provider work', async () => {
        const members = Array.from({ length: 304 }, (_, index) => ({
            id: `member-${index}`,
            wins: 0,
            losses: 0,
            user: { id: `user-${index}`, name: `User ${index}` },
            fantasyTeam: { id: `team-${index}`, name: `Team ${index}` },
        }))
        const tournament = {
            id: 'league-1',
            leagueSlug: 'mlb',
            externalSeasonId: 2026,
            status: LeagueStatus.IN_SEASON,
            startsAt: new Date(),
            totalWeeks: 12,
        }
        const prepareMemberWeeks = vi.fn()
        const findStandingsMembers = vi.fn().mockResolvedValue(members)
        const warmProviderCache = vi.fn()
        const totalsThroughWeek = vi.fn().mockResolvedValue(
            new Map(members.map((member) => [member.id, 100])),
        )
        const scoring = {
            warmProviderCache,
            prepareMemberWeeks,
            totalsThroughWeek,
        }
        const service = new TournamentsService(
            {
                findById: vi.fn().mockResolvedValue(tournament),
                findStandingsMembers,
            } as never,
            scoring as never,
            { findByLeagueId: vi.fn().mockResolvedValue({ id: 'rule-1' }) } as never,
        )

        await service.getTournamentStandings('league-1')

        expect(totalsThroughWeek).toHaveBeenCalledWith(
            members.map((member) => member.id),
            1,
        )
        expect(prepareMemberWeeks).not.toHaveBeenCalled()
        expect(warmProviderCache).not.toHaveBeenCalled()
        expect(findStandingsMembers).toHaveBeenCalledOnce()
    })
})
