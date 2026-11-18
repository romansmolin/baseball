import { describe, expect, it, vi } from 'vitest'

import type { IFantasyTeamRepository } from '../../../../repositories/fantasy-team/fantasy-team.repository.interface'
import type { ISportsProvider } from '../../../../providers/sports-provider.interface'
import type { IOpenAIProvider } from '../../provider/openai.provider'
import {
    TradeAdvisorFeature,
    tradeAdvisorInputSchema,
    tradeAdvisorOutputSchema,
} from '../../features/trade-advisor.feature'

const buildFantasyTeamRepo = (team: unknown = null): IFantasyTeamRepository =>
    ({
        findById: vi.fn().mockResolvedValue(team),
        findByUserId: vi.fn(),
        updateName: vi.fn(),
        create: vi.fn(),
        replaceRoster: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any

const savedTeam = (userId: string) => ({
    id: 't1',
    userId,
    rosterSlots: [
        {
            externalPlayerId: 999,
            playerName: 'Roster Guy',
            slotPosition: 'SS',
            playerPosition: 'SS',
        },
    ],
})

const buildSportsProvider = (): ISportsProvider =>
    ({
        name: 'mlb-test',
        getTeams: vi.fn(),
        getTeamById: vi.fn(),
        getPlayers: vi.fn(),
        getPlayerById: vi.fn().mockImplementation(async (id: number) => ({
            id,
            fullName: `Player ${id}`,
            firstName: 'P',
            lastName: String(id),
            primaryPosition: 'OF',
            teamId: 147,
            teamName: 'NYY',
            teamAbbreviation: 'NYY',
            birthDate: null,
            age: null,
            bats: null,
            throws: null,
            jerseyNumber: null,
            photoUrl: null,
            active: true,
        })),
        getPlayersByTeam: vi.fn(),
        getSchedule: vi.fn(),
        getBoxScore: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any

const buildOpenAI = (output: unknown): IOpenAIProvider => ({
    complete: vi.fn().mockResolvedValue({
        output,
        tokenUsage: { inputTokens: 400, outputTokens: 200 },
        modelUsed: 'gpt-5.4',
    }),
})

const validOutput = {
    verdict: 'accept' as const,
    fairnessScore: 0.4,
    givingValue: 30,
    receivingValue: 45,
    teamFitImpact:
        'Receiving filler at SS shores up the weak spot in your starting lineup.',
    keyRisks: ['Aging player on the receiving side may regress.'],
    keyUpsides: ['Net +15 valuation; helps positional balance.'],
    summary: 'Solid acceptance — value gain and roster fit both check out.',
}

describe('TradeAdvisorFeature', () => {
    it('input schema requires non-empty giving and receiving arrays', () => {
        expect(
            tradeAdvisorInputSchema.safeParse({ giving: [], receiving: ['1'] }).success,
        ).toBe(false)
        expect(
            tradeAdvisorInputSchema.safeParse({ giving: ['1'], receiving: [] }).success,
        ).toBe(false)
    })

    it('input schema defaults scoringPreset to POINTS and rejects unknown presets', () => {
        const ok = tradeAdvisorInputSchema.parse({ giving: ['1'], receiving: ['2'] })
        expect(ok.scoringPreset).toBe('POINTS')
        expect(
            tradeAdvisorInputSchema.safeParse({
                giving: ['1'],
                receiving: ['2'],
                scoringPreset: 'ROTO',
            }).success,
        ).toBe(false)
    })

    it('output schema rejects fairnessScore outside [-1,1]', () => {
        expect(
            tradeAdvisorOutputSchema.safeParse({
                ...validOutput,
                fairnessScore: 2,
            }).success,
        ).toBe(false)
    })

    it('uses complex_reasoning tier', async () => {
        const openai = buildOpenAI(validOutput)
        const feature = new TradeAdvisorFeature(
            openai,
            buildSportsProvider(),
            buildFantasyTeamRepo(),
        )
        await feature.invoke('u1', {
            giving: ['100'],
            receiving: ['200'],
            scoringPreset: 'POINTS',
        })
        const opts = (openai.complete as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(opts.tier).toBe('complex_reasoning')
        expect(opts.schemaName).toBe('TradeAdvisorOutput')
    })

    it('happy path returns structured verdict and sends the scoring preset', async () => {
        const openai = buildOpenAI(validOutput)
        const feature = new TradeAdvisorFeature(
            openai,
            buildSportsProvider(),
            buildFantasyTeamRepo(),
        )
        const result = await feature.invoke('u1', {
            giving: ['100'],
            receiving: ['200', '300'],
            scoringPreset: 'CATEGORIES_5X5',
        })
        expect(result.output.verdict).toBe('accept')
        const inputJson = (openai.complete as ReturnType<typeof vi.fn>).mock.calls[0][0].input
        expect(inputJson).toContain('Player 100')
        expect(inputJson).toContain('Player 200')
        expect(inputJson).toContain('CATEGORIES_5X5')
    })

    it('includes the saved team roster when a teamId is given', async () => {
        const openai = buildOpenAI(validOutput)
        const feature = new TradeAdvisorFeature(
            openai,
            buildSportsProvider(),
            buildFantasyTeamRepo(savedTeam('u1')),
        )
        await feature.invoke('u1', {
            teamId: 't1',
            giving: ['1'],
            receiving: ['2'],
            scoringPreset: 'POINTS',
        })
        const inputJson = (openai.complete as ReturnType<typeof vi.fn>).mock.calls[0][0].input
        expect(inputJson).toContain('Roster Guy')
    })

    it('rejects a team owned by another user', async () => {
        const feature = new TradeAdvisorFeature(
            buildOpenAI(validOutput),
            buildSportsProvider(),
            buildFantasyTeamRepo(savedTeam('someone-else')),
        )
        await expect(
            feature.invoke('u1', {
                teamId: 't1',
                giving: ['1'],
                receiving: ['2'],
                scoringPreset: 'POINTS',
            }),
        ).rejects.toThrow(/not owned/)
    })

    it('throws when the team is missing', async () => {
        const feature = new TradeAdvisorFeature(
            buildOpenAI(validOutput),
            buildSportsProvider(),
            buildFantasyTeamRepo(null),
        )
        await expect(
            feature.invoke('u1', {
                teamId: 'nope',
                giving: ['1'],
                receiving: ['2'],
                scoringPreset: 'POINTS',
            }),
        ).rejects.toThrow(/Team nope not found/)
    })

    it('throws when a player id is not numeric', async () => {
        const feature = new TradeAdvisorFeature(
            buildOpenAI(validOutput),
            buildSportsProvider(),
            buildFantasyTeamRepo(),
        )
        await expect(
            feature.invoke('u1', {
                giving: ['abc'],
                receiving: ['2'],
                scoringPreset: 'POINTS',
            }),
        ).rejects.toThrow(/numeric/)
    })
})
