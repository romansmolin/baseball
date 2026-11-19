import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_SCORING_RULES } from '@/shared/team-builder'

import { ApiError } from '../../../errors/api.error'
import type { FantasyTeamWithRoster } from '../../../models/fantasy-team/fantasy-team.model'
import type { IFantasyTeamRepository } from '../../../repositories/fantasy-team/fantasy-team.repository.interface'
import { MeService } from '../me.service'

const legacySlot = (id: string, slotPosition: string, createdAt: number) => ({
    id,
    fantasyTeamId: 't1',
    externalPlayerId: Number(id.replace(/\D/g, '')),
    playerName: id,
    playerPosition: 'OF',
    playerTeamName: 'NYY',
    playerPhotoUrl: null,
    slotPosition,
    slotIndex: 0,
    salaryAtLock: 5000,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
})

// A team saved before settings existed: `{}` rules, `[]` slots, three OF rows at index 0.
const legacyRow = {
    id: 't1',
    userId: 'u1',
    name: 'Old team',
    leagueSlug: 'mlb',
    platform: 'OTHER',
    scoringPreset: 'POINTS',
    format: 'H2H_POINTS',
    forecastPeriod: 'WEEK',
    lineupChanges: 'DAILY',
    scoringRules: {},
    slotConfig: [],
    categories: [],
    salaryCap: null,
    captainExternalPlayerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    rosterSlots: [
        legacySlot('p1', 'OF', 1),
        legacySlot('p2', 'OF', 2),
        legacySlot('p3', 'OF', 3),
    ],
} as unknown as FantasyTeamWithRoster

const fakeRepo = (rows: FantasyTeamWithRoster[]): IFantasyTeamRepository =>
    ({
        findByUserId: async () => rows,
        findById: async (id: string) => rows.find((row) => row.id === id) ?? null,
        create: async () => legacyRow,
    }) as unknown as IFantasyTeamRepository

const player = (externalPlayerId: number, slotKey: string, position = 'SS') => ({
    externalPlayerId,
    slotKey,
    position: position as 'SS',
    name: 'P',
    teamName: 'T',
    salaryAtLock: null,
})

describe('categories and Roto', () => {
    it('a team saved before categories existed opens with all ten', async () => {
        const { teams } = await new MeService(fakeRepo([legacyRow])).getMyTeams('u1')

        expect(teams[0].categories).toEqual(['R', 'HR', 'RBI', 'SB', 'AVG', 'W', 'SV', 'K', 'ERA', 'WHIP'])
    })

    it('Roto always saves on the season horizon, and chosen categories are kept', async () => {
        const create = vi.fn().mockResolvedValue(legacyRow)
        const repo = { ...fakeRepo([]), create } as unknown as IFantasyTeamRepository

        await new MeService(repo).createMyTeam('u1', {
            name: 'Roto',
            leagueSlug: 'mlb',
            format: 'ROTO',
            forecastPeriod: 'WEEK',
            categories: ['HR', 'SB'],
            players: [],
        })

        const settings = create.mock.calls[0][0].settings
        expect(settings.forecastPeriod).toBe('SEASON')
        expect(settings.categories).toEqual(['HR', 'SB'])
    })
})

describe('MeService.updateMyTeamLineup', () => {
    it('passes only the six settings to the repository, never players or platform', async () => {
        const replaceRoster = vi.fn().mockResolvedValue(legacyRow)
        const repo = { ...fakeRepo([legacyRow]), replaceRoster } as unknown as IFantasyTeamRepository

        await new MeService(repo).updateMyTeamLineup('u1', 't1', {
            players: [player(1, 'SS:0')],
            platform: 'YAHOO',
            forecastPeriod: 'DAY',
        })

        const input = replaceRoster.mock.calls[0][0]
        expect(Object.keys(input.settings).sort()).toEqual(
            ['categories', 'forecastPeriod', 'format', 'lineupChanges', 'salaryCap', 'scoringRules', 'slotConfig'],
        )
        expect(input.settings.forecastPeriod).toBe('DAY')
        expect(input.platform).toBe('YAHOO')
    })
})

describe('MeService', () => {
    it('opens a legacy team with distinct OF slots and default settings', async () => {
        const { teams } = await new MeService(fakeRepo([legacyRow])).getMyTeams('u1')

        expect(teams[0].rosterSlots.map((slot) => slot.slotPosition)).toEqual(['OF:0', 'OF:1', 'OF:2'])
        expect(teams[0].scoringRules).toEqual(DEFAULT_SCORING_RULES)
        expect(teams[0].slotConfig).toHaveLength(7)
        expect(teams[0].isComplete).toBe(false)
    })

    it('saves a one-player draft but rejects two players on one slot', async () => {
        const service = new MeService(fakeRepo([]))

        await expect(
            service.createMyTeam('u1', { name: 'Draft', leagueSlug: 'mlb', players: [player(1, 'SS:0')] }),
        ).resolves.toBeDefined()
        await expect(
            service.createMyTeam('u1', {
                name: 'Bad',
                leagueSlug: 'mlb',
                players: [player(1, 'SS:0'), player(2, 'SS:0')],
            }),
        ).rejects.toBeInstanceOf(ApiError)
    })
})
