import { describe, expect, it, vi } from 'vitest'

import type { IFantasyTeamRepository } from '../../../../repositories/fantasy-team/fantasy-team.repository.interface'
import type { ILeagueRepository } from '../../../../repositories/league/league.repository.interface'
import type { ILeagueMemberRepository } from '../../../../repositories/league-member/league-member.repository.interface'
import type { IScoringRuleRepository } from '../../../../repositories/scoring-rule/scoring-rule.repository.interface'
import type { ISportsProvider } from '../../../../providers/sports-provider.interface'
import type { IOpenAIProvider } from '../../provider/openai.provider'
import {
    TradeAdvisorFeature,
    tradeAdvisorInputSchema,
    tradeAdvisorOutputSchema,
} from '../../features/trade-advisor.feature'

const buildLeagueRepo = (): ILeagueRepository =>
    ({
        findById: vi.fn().mockResolvedValue({
            id: 'lg1',
            name: 'MLB Summer Classic',
            scoringRuleId: 'sr1',
        }),
        findManyByIds: vi.fn(),
        findByCommissionerId: vi.fn(),
        findManyPublic: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any

const buildLeagueMemberRepo = (): ILeagueMemberRepository =>
    ({
        findByUserId: vi.fn().mockResolvedValue([
            { id: 'lm1', leagueId: 'lg1', userId: 'u1' },
        ]),
        findAllByLeagueId: vi.fn(),
        findByLeagueId: vi.fn(),
        findById: vi.fn(),
        findByLeagueAndUser: vi.fn(),
        create: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any

const buildFantasyTeamRepo = (): IFantasyTeamRepository =>
    ({
        findById: vi.fn(),
        findByUserId: vi.fn(),
        findByLeagueMemberId: vi.fn().mockResolvedValue(null),
        updateName: vi.fn(),
        create: vi.fn(),
        replaceRoster: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any

const buildScoringRuleRepo = (): IScoringRuleRepository =>
    ({
        findByLeagueId: vi.fn().mockResolvedValue({
            id: 'sr1',
            name: 'standard',
            version: 1,
            rule: { single: 3, double: 5, homeRun: 10, rbi: 2 },
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
            tradeAdvisorInputSchema.safeParse({
                leagueId: 'x',
                giving: [],
                receiving: ['1'],
            }).success,
        ).toBe(false)
        expect(
            tradeAdvisorInputSchema.safeParse({
                leagueId: 'x',
                giving: ['1'],
                receiving: [],
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
            buildLeagueRepo(),
            buildLeagueMemberRepo(),
            buildScoringRuleRepo(),
            buildFantasyTeamRepo(),
        )
        await feature.invoke('u1', {
            leagueId: 'lg1',
            giving: ['100'],
            receiving: ['200'],
        })
        const opts = (openai.complete as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(opts.tier).toBe('complex_reasoning')
        expect(opts.schemaName).toBe('TradeAdvisorOutput')
    })

    it('happy path returns structured verdict', async () => {
        const openai = buildOpenAI(validOutput)
        const feature = new TradeAdvisorFeature(
            openai,
            buildSportsProvider(),
            buildLeagueRepo(),
            buildLeagueMemberRepo(),
            buildScoringRuleRepo(),
            buildFantasyTeamRepo(),
        )
        const result = await feature.invoke('u1', {
            leagueId: 'lg1',
            giving: ['100'],
            receiving: ['200', '300'],
        })
        expect(result.output.verdict).toBe('accept')
        const inputJson = (openai.complete as ReturnType<typeof vi.fn>).mock.calls[0][0].input
        expect(inputJson).toContain('Player 100')
        expect(inputJson).toContain('Player 200')
    })

    it('throws when league is missing', async () => {
        const leagueRepo = buildLeagueRepo()
        ;(leagueRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
        const feature = new TradeAdvisorFeature(
            buildOpenAI(validOutput),
            buildSportsProvider(),
            leagueRepo,
            buildLeagueMemberRepo(),
            buildScoringRuleRepo(),
            buildFantasyTeamRepo(),
        )
        await expect(
            feature.invoke('u1', {
                leagueId: 'nope',
                giving: ['1'],
                receiving: ['2'],
            }),
        ).rejects.toThrow(/League nope not found/)
    })
})
