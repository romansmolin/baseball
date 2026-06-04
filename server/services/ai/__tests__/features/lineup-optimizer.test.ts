import { describe, expect, it, vi } from 'vitest'

import type { ILeagueRepository } from '../../../../repositories/league/league.repository.interface'
import type { IScoringRuleRepository } from '../../../../repositories/scoring-rule/scoring-rule.repository.interface'
import type { ISportsProvider } from '../../../../providers/sports-provider.interface'
import type { IOpenAIProvider } from '../../provider/openai.provider'
import {
    LineupOptimizerFeature,
    lineupOptimizerInputSchema,
    lineupOptimizerOutputSchema,
} from '../../features/lineup-optimizer.feature'

const fakeSchedule = [
    {
        gamePk: 700001,
        gameDateUtc: '2026-06-04T19:00:00Z',
        homeTeamId: 147,
        awayTeamId: 111,
        status: 'SCHEDULED' as const,
        doubleHeader: false,
    },
    {
        gamePk: 700002,
        gameDateUtc: '2026-06-04T20:00:00Z',
        homeTeamId: 144,
        awayTeamId: 119,
        status: 'SCHEDULED' as const,
        doubleHeader: false,
    },
]

const buildLeagueRepo = (): ILeagueRepository =>
    ({
        findById: vi.fn().mockResolvedValue({
            id: 't1',
            name: 'MLB Summer Classic',
            leagueSlug: 'mlb',
            scoringRuleId: 'sr1',
        }),
        findManyByIds: vi.fn(),
        findByCommissionerId: vi.fn(),
        findManyPublic: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any

const buildScoringRuleRepo = (): IScoringRuleRepository =>
    ({
        findByLeagueId: vi.fn().mockResolvedValue({
            id: 'sr1',
            name: 'standard',
            version: 1,
            rule: { single: 3, double: 5, homeRun: 10 },
        }),
        findDefault: vi.fn(),
        findById: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any

const buildSportsProvider = (): ISportsProvider =>
    ({
        name: 'mlb-test',
        getTeams: vi.fn(),
        getTeamById: vi.fn(),
        getPlayers: vi.fn(),
        getPlayerById: vi.fn(),
        getPlayersByTeam: vi.fn().mockImplementation(async (teamId: number) =>
            Array.from({ length: 5 }, (_, i) => ({
                id: teamId * 1000 + i,
                fullName: `Player ${teamId}-${i}`,
                firstName: 'P',
                lastName: String(i),
                primaryPosition: 'OF',
                teamId,
                teamName: `Team ${teamId}`,
                teamAbbreviation: 'TST',
                birthDate: null,
                age: null,
                bats: null,
                throws: null,
                jerseyNumber: null,
                photoUrl: null,
                active: true,
            })),
        ),
        getSchedule: vi.fn().mockResolvedValue(fakeSchedule),
        getBoxScore: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any

const buildOpenAI = (output: unknown): IOpenAIProvider => ({
    complete: vi.fn().mockResolvedValue({
        output,
        tokenUsage: { inputTokens: 600, outputTokens: 400 },
        modelUsed: 'gpt-5.4',
    }),
})

const validOutput = {
    suggestedLineup: [
        {
            rosterSlotPosition: 'P' as const,
            externalPlayerId: '147001',
            playerName: 'Player 147-1',
            salary: 4000,
            projectedPoints: 9.4,
            reasoning: 'Steady starter, low variance.',
        },
    ],
    totalSalary: 4000,
    totalProjectedPoints: 9.4,
    overallStrategy: 'Balanced cap usage with one premium hitter.',
    confidenceScore: 0.7,
}

describe('LineupOptimizerFeature', () => {
    it('input schema requires tournamentId', () => {
        expect(
            lineupOptimizerInputSchema.safeParse({ tournamentId: '' }).success,
        ).toBe(false)
    })

    it('output schema rejects confidence outside [0,1]', () => {
        expect(
            lineupOptimizerOutputSchema.safeParse({
                ...validOutput,
                confidenceScore: 1.5,
            }).success,
        ).toBe(false)
    })

    it('uses complex_reasoning tier', async () => {
        const openai = buildOpenAI(validOutput)
        const feature = new LineupOptimizerFeature(
            openai,
            buildSportsProvider(),
            buildLeagueRepo(),
            buildScoringRuleRepo(),
        )
        await feature.invoke('u1', { tournamentId: 't1' })
        const opts = (openai.complete as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(opts.tier).toBe('complex_reasoning')
        expect(opts.schemaName).toBe('LineupOptimizerOutput')
    })

    it('happy path returns structured lineup', async () => {
        const openai = buildOpenAI(validOutput)
        const feature = new LineupOptimizerFeature(
            openai,
            buildSportsProvider(),
            buildLeagueRepo(),
            buildScoringRuleRepo(),
        )
        const result = await feature.invoke('u1', { tournamentId: 't1' })
        expect(result.output.totalSalary).toBe(4000)
        expect(result.output.suggestedLineup[0].rosterSlotPosition).toBe('P')
    })

    it('respects excludePlayerIds', async () => {
        const openai = buildOpenAI(validOutput)
        const feature = new LineupOptimizerFeature(
            openai,
            buildSportsProvider(),
            buildLeagueRepo(),
            buildScoringRuleRepo(),
        )
        await feature.invoke('u1', {
            tournamentId: 't1',
            excludePlayerIds: ['147001'],
        })
        const inputJson = (openai.complete as ReturnType<typeof vi.fn>).mock.calls[0][0].input
        expect(inputJson).not.toContain('"externalPlayerId": 147001,')
    })
})
