import { describe, expect, it, vi } from 'vitest'

import type { ISportsProvider } from '../../../../providers/sports-provider.interface'
import type { IOpenAIProvider } from '../../provider/openai.provider'
import {
    MatchupPredictorFeature,
    matchupPredictorInputSchema,
    matchupPredictorOutputSchema,
} from '../../features/matchup-predictor.feature'

const fakeSchedule = [
    {
        gamePk: 700123,
        gameDateUtc: '2026-06-04T19:00:00Z',
        homeTeamId: 147,
        awayTeamId: 111,
        status: 'SCHEDULED' as const,
        doubleHeader: false,
    },
]

const buildSportsProvider = (): ISportsProvider =>
    ({
        name: 'mlb-test',
        getTeams: vi.fn(),
        getTeamById: vi.fn().mockImplementation(async (id: number) => ({
            id,
            name: id === 147 ? 'New York Yankees' : 'Boston Red Sox',
            abbreviation: id === 147 ? 'NYY' : 'BOS',
            locationName: null,
            teamName: null,
        })),
        getPlayers: vi.fn(),
        getPlayerById: vi.fn(),
        getPlayersByTeam: vi.fn().mockImplementation(async (id: number) => [
            {
                id: id * 10 + 1,
                fullName: id === 147 ? 'Aaron Judge' : 'Rafael Devers',
                firstName: '',
                lastName: '',
                primaryPosition: 'OF',
                teamId: id,
                teamName: null,
                teamAbbreviation: null,
                birthDate: null,
                age: null,
                bats: null,
                throws: null,
                jerseyNumber: null,
                photoUrl: null,
                active: true,
            },
        ]),
        getSchedule: vi.fn().mockResolvedValue(fakeSchedule),
        getBoxScore: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any

const buildOpenAI = (output: unknown): IOpenAIProvider => ({
    complete: vi.fn().mockResolvedValue({
        output,
        tokenUsage: { inputTokens: 30, outputTokens: 80 },
        modelUsed: 'gpt-5.2',
    }),
})

const validOutput = {
    gameId: '700123',
    homeTeam: 'New York Yankees',
    awayTeam: 'Boston Red Sox',
    predictedWinner: 'New York Yankees',
    winProbability: 0.6,
    predictedScore: { home: 5, away: 4 },
    keyPlayersToWatch: [
        {
            externalPlayerId: '1471',
            playerName: 'Aaron Judge',
            reason: 'Power upside vs RHP',
        },
    ],
    confidence: 'medium' as const,
}

describe('MatchupPredictorFeature', () => {
    it('input schema rejects empty externalGameId', () => {
        expect(matchupPredictorInputSchema.safeParse({ externalGameId: '' }).success).toBe(false)
    })

    it('output schema accepts a well-formed response', () => {
        expect(matchupPredictorOutputSchema.safeParse(validOutput).success).toBe(true)
    })

    it('rejects winProbability outside [0,1]', () => {
        expect(
            matchupPredictorOutputSchema.safeParse({
                ...validOutput,
                winProbability: 1.5,
            }).success,
        ).toBe(false)
    })

    it('selects the cheap tier when invoking the provider', async () => {
        const openai = buildOpenAI(validOutput)
        const feature = new MatchupPredictorFeature(openai, buildSportsProvider())
        await feature.invoke('user-1', { externalGameId: '700123' })
        expect(openai.complete).toHaveBeenCalledTimes(1)
        const opts = (openai.complete as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(opts.tier).toBe('cheap')
        expect(opts.schemaName).toBe('MatchupPredictorOutput')
    })

    it('happy path: fetches context and returns structured output', async () => {
        const openai = buildOpenAI(validOutput)
        const feature = new MatchupPredictorFeature(openai, buildSportsProvider())
        const result = await feature.invoke('user-1', {
            externalGameId: '700123',
        })
        expect(result.output.predictedWinner).toBe('New York Yankees')
        expect(result.tokenUsage.inputTokens).toBe(30)
    })

    it('throws when the gamePk is not found in the schedule window', async () => {
        const openai = buildOpenAI(validOutput)
        const sports = buildSportsProvider()
        const feature = new MatchupPredictorFeature(openai, sports)
        await expect(
            feature.invoke('user-1', { externalGameId: '999999' }),
        ).rejects.toThrow(/not found in schedule/)
    })

    it('throws when externalGameId is non-numeric', async () => {
        const openai = buildOpenAI(validOutput)
        const feature = new MatchupPredictorFeature(openai, buildSportsProvider())
        await expect(
            feature.invoke('user-1', { externalGameId: 'not-a-number' }),
        ).rejects.toThrow(/numeric/)
    })
})
