import { describe, expect, it, vi } from 'vitest'

import type { ISportsProvider } from '../../../../providers/sports-provider.interface'
import type { IOpenAIProvider } from '../../provider/openai.provider'
import {
    PlayerAnalysisFeature,
    playerAnalysisInputSchema,
    playerAnalysisOutputSchema,
} from '../../features/player-analysis.feature'

const fakeSchedule = [
    {
        gamePk: 700001,
        gameDateUtc: '2026-06-01T19:00:00Z',
        homeTeamId: 147,
        awayTeamId: 111,
        status: 'FINAL' as const,
        doubleHeader: false,
    },
    {
        gamePk: 700002,
        gameDateUtc: '2026-06-05T19:00:00Z',
        homeTeamId: 111,
        awayTeamId: 147,
        status: 'SCHEDULED' as const,
        doubleHeader: false,
    },
]

const buildSportsProvider = (overrides: Partial<ISportsProvider> = {}): ISportsProvider =>
    ({
        name: 'mlb-test',
        getTeams: vi.fn(),
        getTeamById: vi.fn().mockResolvedValue({
            id: 111,
            name: 'Boston Red Sox',
            abbreviation: 'BOS',
            locationName: null,
            teamName: null,
        }),
        getPlayers: vi.fn(),
        getPlayerById: vi.fn().mockResolvedValue({
            id: 592450,
            fullName: 'Aaron Judge',
            firstName: 'Aaron',
            lastName: 'Judge',
            primaryPosition: 'OF',
            teamId: 147,
            teamName: 'New York Yankees',
            teamAbbreviation: 'NYY',
            birthDate: null,
            age: null,
            bats: null,
            throws: null,
            jerseyNumber: null,
            photoUrl: null,
            active: true,
        }),
        getPlayersByTeam: vi.fn(),
        getSchedule: vi.fn().mockImplementation((filters: { teamId?: number }) => {
            if (!filters.teamId) return Promise.resolve([])
            return Promise.resolve(fakeSchedule)
        }),
        getBoxScore: vi.fn().mockResolvedValue({
            gamePk: 700001,
            status: 'FINAL',
            batters: [
                {
                    externalPlayerId: 592450,
                    hits: 2,
                    doubles: 0,
                    triples: 0,
                    homeRuns: 1,
                    rbi: 3,
                    runs: 1,
                    stolenBases: 0,
                    baseOnBalls: 1,
                    strikeOuts: 1,
                },
            ],
            pitchers: [],
        }),
        ...overrides,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any

const buildOpenAI = (output: unknown): IOpenAIProvider => ({
    complete: vi.fn().mockResolvedValue({
        output,
        tokenUsage: { inputTokens: 200, outputTokens: 120 },
        modelUsed: 'gpt-5.3',
    }),
})

const validOutput = {
    playerName: 'Aaron Judge',
    currentForm: 'hot' as const,
    recentTrend: 'HR in 2 of last 5; high OBP.',
    nextGameMatchup: {
        opposingTeam: 'Boston Red Sox',
        opposingPitcher: null,
        favorability: 'favorable' as const,
        notes: 'Right-handed power matches up well against weak BOS RHP rotation.',
    },
    fantasyOutlook:
        'Start with confidence. Power upside is back and contact rate has stabilized.',
    keyStats: [
        { label: 'BA (L10)', value: '.305' },
        { label: 'HR (L10)', value: '4' },
        { label: 'wRC+ (L30)', value: '162' },
    ],
    recommendation: 'start' as const,
}

describe('PlayerAnalysisFeature', () => {
    it('input schema rejects empty externalPlayerId', () => {
        expect(playerAnalysisInputSchema.safeParse({ externalPlayerId: '' }).success).toBe(false)
    })

    it('output schema accepts a well-formed response', () => {
        expect(playerAnalysisOutputSchema.safeParse(validOutput).success).toBe(true)
    })

    it('output schema rejects invalid currentForm enum', () => {
        expect(
            playerAnalysisOutputSchema.safeParse({
                ...validOutput,
                currentForm: 'lukewarm',
            }).success,
        ).toBe(false)
    })

    it('uses the default model tier', async () => {
        const openai = buildOpenAI(validOutput)
        const feature = new PlayerAnalysisFeature(openai, buildSportsProvider())
        await feature.invoke('user-1', { externalPlayerId: '592450' })
        const opts = (openai.complete as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(opts.tier).toBe('default')
        expect(opts.schemaName).toBe('PlayerAnalysisOutput')
    })

    it('happy path returns structured output and includes player + matchup context', async () => {
        const openai = buildOpenAI(validOutput)
        const feature = new PlayerAnalysisFeature(openai, buildSportsProvider())
        const result = await feature.invoke('u', { externalPlayerId: '592450' })
        expect(result.output.recommendation).toBe('start')
        const inputJson = (openai.complete as ReturnType<typeof vi.fn>).mock.calls[0][0].input
        expect(inputJson).toContain('Aaron Judge')
        expect(inputJson).toContain('Boston Red Sox')
    })

    it('throws when player has no team', async () => {
        const provider = buildSportsProvider({
            getPlayerById: vi.fn().mockResolvedValue({
                id: 1,
                fullName: 'Test',
                firstName: 'T',
                lastName: '',
                primaryPosition: 'OF',
                teamId: null,
                teamName: null,
                teamAbbreviation: null,
                birthDate: null,
                age: null,
                bats: null,
                throws: null,
                jerseyNumber: null,
                photoUrl: null,
                active: true,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any),
        })
        const feature = new PlayerAnalysisFeature(buildOpenAI(validOutput), provider)
        await expect(
            feature.invoke('u', { externalPlayerId: '1' }),
        ).rejects.toThrow(/not currently on a team/)
    })
})
