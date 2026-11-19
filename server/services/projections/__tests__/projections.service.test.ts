import { describe, expect, it } from 'vitest'

import type { ProviderPlayer } from '../../../providers/dto/provider-player.dto'
import type { ProviderScheduledGame } from '../../../providers/dto/provider-schedule.dto'
import type { ISportsProvider } from '../../../providers/sports-provider.interface'
import { DEFAULT_SCORING_RULES } from '@/shared/team-builder'
import { ProjectionsService } from '../projections.service'

const withStats = {
    id: 1, teamId: 10, primaryPosition: 'SS', active: true,
    battingStats: { gamesPlayed: 100, plateAppearances: 450, hits: 150, runs: 60, rbi: 70, strikeOuts: 80 },
} as unknown as ProviderPlayer
const noStats = { id: 2, teamId: 10, primaryPosition: 'C', active: true } as unknown as ProviderPlayer

const game = (n: number): ProviderScheduledGame =>
    ({ gamePk: n, homeTeamId: 10, awayTeamId: 11, status: 'SCHEDULED' }) as ProviderScheduledGame

const providerWith = (games: ProviderScheduledGame[]) =>
    ({
        getPlayersByTeam: async () => [withStats, noStats],
        getSchedule: async () => games,
        getGameContexts: async () => [],
        getTeamStandings: async () => [{ teamId: 10, wins: 50, losses: 50, lastTen: null }],
    }) as unknown as ISportsProvider

const input = { teamIds: [10], period: 'WEEK' as const, rules: DEFAULT_SCORING_RULES }

describe('ProjectionsService', () => {
    it('off-season: no games in the period still projects, on season pace', async () => {
        const result = await new ProjectionsService(providerWith([])).projectTeams(input)

        expect(result.basis).toBe('season-pace')
        expect(result.projections[1].points).not.toBeNull()
        expect(result.projections[1].games).toBeCloseTo(6, 1)
    })

    it('uses the real schedule when it has games', async () => {
        const result = await new ProjectionsService(providerWith([game(1), game(2), game(3), game(4), game(5)])).projectTeams(input)

        expect(result.basis).toBe('schedule')
        expect(result.projections[1].games).toBeCloseTo(5, 1)
    })

    it('when last season is used for stats, standings come from that same season', async () => {
        const seasons: number[] = []
        const provider = {
            ...providerWith([]),
            getPlayersByTeam: async (_id: number, opts: { statsSeason: number }) => (opts.statsSeason === 2025 ? [withStats] : [noStats]),
            getTeamStandings: async (season: number) => {
                seasons.push(season)
                return []
            },
        } as unknown as ISportsProvider

        await new ProjectionsService(provider).projectTeams({ ...input, now: new Date('2026-02-10T12:00:00Z') })

        expect(seasons).toEqual([2025])
    })

    it('projects the teams of players given by id, with no team ids at all', async () => {
        const asked: number[] = []
        const provider = {
            ...providerWith([]),
            getPlayersByIds: async () => [{ id: 1, teamId: 10 }],
            getPlayersByTeam: async (id: number) => {
                asked.push(id)
                return [withStats]
            },
        } as unknown as ISportsProvider

        const result = await new ProjectionsService(provider).projectTeams({ ...input, teamIds: [], playerIds: [1] })

        expect(asked).toEqual([10])
        expect(result.projections[1].points).not.toBeNull()
    })

    it('a player with no stats gets null points and NO_STATS', async () => {
        const result = await new ProjectionsService(providerWith([])).projectTeams(input)

        expect(result.projections[2]).toMatchObject({ points: null, reason: 'NO_STATS' })
    })
})
