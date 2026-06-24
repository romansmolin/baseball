import { describe, expect, it, vi } from 'vitest'

import type { ISportsProvider } from '../../../../providers/sports-provider.interface'
import type { IOpenAIProvider } from '../../provider/openai.provider'
import {
    completeAutofill,
    TeamBuilderAutofillFeature,
    tbAutofillInputSchema,
    tbAutofillOutputSchema,
} from '../../features/team-builder-autofill.feature'

const ALL_SLOTS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const

// A pool with at least one cheap, available, eligible player for every slot.
const fullPool = () => [
    { externalPlayerId: 1, fullName: 'Pitcher', primaryPosition: 'SP', teamName: 'T', salary: 3000, projectedPoints: 10, available: true },
    { externalPlayerId: 2, fullName: 'Reliever', primaryPosition: 'RP', teamName: 'T', salary: 3000, projectedPoints: 9, available: true },
    { externalPlayerId: 3, fullName: 'Catcher', primaryPosition: 'C', teamName: 'T', salary: 3000, projectedPoints: 8, available: true },
    { externalPlayerId: 4, fullName: 'First', primaryPosition: '1B', teamName: 'T', salary: 3000, projectedPoints: 8, available: true },
    { externalPlayerId: 5, fullName: 'Second', primaryPosition: '2B', teamName: 'T', salary: 3000, projectedPoints: 8, available: true },
    { externalPlayerId: 6, fullName: 'Third', primaryPosition: '3B', teamName: 'T', salary: 3000, projectedPoints: 8, available: true },
    { externalPlayerId: 7, fullName: 'Short', primaryPosition: 'SS', teamName: 'T', salary: 3000, projectedPoints: 8, available: true },
    { externalPlayerId: 8, fullName: 'OF One', primaryPosition: 'OF', teamName: 'T', salary: 3000, projectedPoints: 8, available: true },
    { externalPlayerId: 9, fullName: 'OF Two', primaryPosition: 'OF', teamName: 'T', salary: 3000, projectedPoints: 8, available: true },
    { externalPlayerId: 10, fullName: 'OF Three', primaryPosition: 'OF', teamName: 'T', salary: 3000, projectedPoints: 8, available: true },
    { externalPlayerId: 11, fullName: 'DH Bench', primaryPosition: 'DH', teamName: 'T', salary: 3000, projectedPoints: 8, available: true },
]

const buildSportsProvider = (): ISportsProvider =>
    ({
        name: 'mlb-test',
        getTeams: vi.fn(),
        getTeamById: vi.fn().mockResolvedValue({
            id: 147,
            name: 'New York Yankees',
            abbreviation: 'NYY',
            locationName: null,
            teamName: null,
        }),
        getPlayers: vi.fn(),
        getPlayerById: vi.fn(),
        getPlayersByTeam: vi.fn().mockResolvedValue([
            {
                id: 100,
                fullName: 'Pitcher One',
                firstName: 'P',
                lastName: 'O',
                // Provider emits normalized Position codes ('SP'/'RP'),
                // never the raw 'P' — the prompt must map accordingly.
                primaryPosition: 'SP',
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
            },
        ]),
        getSchedule: vi.fn(),
        getBoxScore: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any

const buildOpenAI = (output: unknown): IOpenAIProvider => ({
    complete: vi.fn().mockResolvedValue({
        output,
        tokenUsage: { inputTokens: 200, outputTokens: 100 },
        modelUsed: 'gpt-5.2',
    }),
})

const validOutput = {
    suggestedPicks: [
        {
            slotKey: 'P' as const,
            externalPlayerId: 100,
            playerName: 'Pitcher One',
        },
    ],
    strategy: 'Filled pitcher with the steadiest option.',
    salaryUsed: 4000,
}

describe('TeamBuilderAutofillFeature', () => {
    it('input schema requires mlbTeamIds (>=1) and salaryCap', () => {
        expect(
            tbAutofillInputSchema.safeParse({ mlbTeamIds: [147] }).success,
        ).toBe(false)
        expect(
            tbAutofillInputSchema.safeParse({ mlbTeamIds: [], salaryCap: 60000 })
                .success,
        ).toBe(false)
        expect(
            tbAutofillInputSchema.safeParse({
                mlbTeamIds: [147],
                salaryCap: 60000,
            }).success,
        ).toBe(true)
        expect(
            tbAutofillInputSchema.safeParse({
                mlbTeamIds: [147, 121],
                salaryCap: 60000,
            }).success,
        ).toBe(true)
    })

    it('output schema rejects invalid slotKey', () => {
        expect(
            tbAutofillOutputSchema.safeParse({
                ...validOutput,
                suggestedPicks: [
                    {
                        slotKey: 'BENCH',
                        externalPlayerId: 1,
                        playerName: 'x',
                        reasoning: 'y',
                    },
                ],
            }).success,
        ).toBe(false)
    })

    it('uses cheap tier and the right schema name', async () => {
        const openai = buildOpenAI(validOutput)
        const feature = new TeamBuilderAutofillFeature(openai, buildSportsProvider())
        await feature.invoke('u1', { mlbTeamIds: [147], salaryCap: 60000 })
        const opts = (openai.complete as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(opts.tier).toBe('cheap')
        expect(opts.schemaName).toBe('TBAutofillOutput')
        expect(opts.maxOutputTokens).toBeGreaterThanOrEqual(6000)
    })

    it('passes filled slots and remaining cap to the prompt', async () => {
        const openai = buildOpenAI(validOutput)
        const feature = new TeamBuilderAutofillFeature(openai, buildSportsProvider())
        await feature.invoke('u1', {
            mlbTeamIds: [147],
            salaryCap: 60000,
            filledSlots: [{ slotKey: 'C', externalPlayerId: 200 }],
        })
        const opts = (openai.complete as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(opts.input).toContain('"slotKey": "C"')
        expect(opts.input).toContain('"emptySlotKeys"')
    })

    it('prompt maps normalized position codes to slots (SP/RP→P, OF→LF/CF/RF)', async () => {
        const openai = buildOpenAI(validOutput)
        const feature = new TeamBuilderAutofillFeature(openai, buildSportsProvider())
        await feature.invoke('u1', { mlbTeamIds: [147], salaryCap: 60000 })
        const opts = (openai.complete as ReturnType<typeof vi.fn>).mock.calls[0][0]
        // Pitcher slot must accept the codes the provider actually emits,
        // otherwise the model never fills P (and OF slots stay empty too).
        expect(opts.instructions).toContain('"SP" or "RP"')
        expect(opts.instructions).toContain('"OF"')
        // The provider's pitcher (primaryPosition 'SP') is in the serialized pool.
        expect(opts.input).toContain('"primaryPosition": "SP"')
    })

    it('happy path returns structured picks', async () => {
        const openai = buildOpenAI(validOutput)
        const feature = new TeamBuilderAutofillFeature(openai, buildSportsProvider())
        const result = await feature.invoke('u1', {
            mlbTeamIds: [147],
            salaryCap: 60000,
        })
        expect(result.output.suggestedPicks[0].slotKey).toBe('P')
        expect(result.output.suggestedPicks[0].externalPlayerId).toBe(100)
    })

    describe('completeAutofill (deterministic completion)', () => {
        it('fills every empty slot when the pool has eligible players in budget', () => {
            const { suggestedPicks } = completeAutofill({
                modelPicks: [],
                emptySlotKeys: [...ALL_SLOTS],
                pool: fullPool(),
                salaryBudget: 60000,
            })
            expect(suggestedPicks).toHaveLength(9)
            expect(new Set(suggestedPicks.map((p) => p.slotKey))).toEqual(
                new Set(ALL_SLOTS),
            )
            // No player reused across slots.
            expect(new Set(suggestedPicks.map((p) => p.externalPlayerId)).size).toBe(9)
        })

        it('assigns three distinct outfielders to LF/CF/RF', () => {
            const { suggestedPicks } = completeAutofill({
                modelPicks: [],
                emptySlotKeys: ['LF', 'CF', 'RF'],
                pool: fullPool(),
                salaryBudget: 60000,
            })
            const of = suggestedPicks.filter((p) => ['LF', 'CF', 'RF'].includes(p.slotKey))
            expect(of).toHaveLength(3)
            expect(new Set(of.map((p) => p.externalPlayerId)).size).toBe(3)
        })

        it('recovers from the model labelling two outfielders with the same slotKey', () => {
            const { suggestedPicks } = completeAutofill({
                // Model collides on CF and never mentions LF/RF.
                modelPicks: [
                    { slotKey: 'CF', externalPlayerId: 8 },
                    { slotKey: 'CF', externalPlayerId: 9 },
                ],
                emptySlotKeys: ['LF', 'CF', 'RF'],
                pool: fullPool(),
                salaryBudget: 60000,
            })
            expect(new Set(suggestedPicks.map((p) => p.slotKey))).toEqual(
                new Set(['LF', 'CF', 'RF']),
            )
        })

        it('never places a DH and never exceeds the budget', () => {
            const { suggestedPicks, salaryUsed } = completeAutofill({
                modelPicks: [],
                emptySlotKeys: [...ALL_SLOTS],
                pool: fullPool(),
                salaryBudget: 20000, // only enough for ~6 players at 3000 each
            })
            const ids = suggestedPicks.map((p) => p.externalPlayerId)
            expect(ids).not.toContain(11) // the DH
            expect(salaryUsed).toBeLessThanOrEqual(20000)
        })

        it('honors a valid model pick over the cheapest backfill', () => {
            const pool = fullPool()
            // Make a pricier preferred catcher; model should still win since budget allows.
            pool.push({ externalPlayerId: 99, fullName: 'Star C', primaryPosition: 'C', teamName: 'T', salary: 9000, projectedPoints: 30, available: true })
            const { suggestedPicks } = completeAutofill({
                modelPicks: [{ slotKey: 'C', externalPlayerId: 99 }],
                emptySlotKeys: ['C'],
                pool,
                salaryBudget: 60000,
            })
            expect(suggestedPicks).toEqual([
                { slotKey: 'C', externalPlayerId: 99, playerName: 'Star C' },
            ])
        })
    })

    it('invoke returns a fully completed lineup even when the model returns nothing', async () => {
        const sports = {
            ...buildSportsProvider(),
            getPlayersByTeam: vi.fn().mockResolvedValue(
                fullPool().map((p) => ({
                    id: p.externalPlayerId,
                    fullName: p.fullName,
                    firstName: 'x',
                    lastName: 'y',
                    primaryPosition: p.primaryPosition,
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
            ),
        }
        const openai = buildOpenAI({ suggestedPicks: [], strategy: 's', salaryUsed: 0 })
        const feature = new TeamBuilderAutofillFeature(openai, sports as ISportsProvider)
        const result = await feature.invoke('u1', { mlbTeamIds: [147], salaryCap: 60000 })
        expect(result.output.suggestedPicks).toHaveLength(9)
    })

    it('fetches every selected team and merges rosters into one pool', async () => {
        const sports = {
            ...buildSportsProvider(),
            getTeamById: vi.fn().mockImplementation((id: number) =>
                Promise.resolve({
                    id,
                    name: id === 147 ? 'New York Yankees' : 'Boston Red Sox',
                    abbreviation: id === 147 ? 'NYY' : 'BOS',
                    locationName: null,
                    teamName: null,
                }),
            ),
            getPlayersByTeam: vi.fn().mockImplementation((id: number) =>
                Promise.resolve([
                    {
                        id: id === 147 ? 100 : 200,
                        fullName: id === 147 ? 'Yankee Bat' : 'Sox Bat',
                        firstName: 'x',
                        lastName: 'y',
                        primaryPosition: 'SS',
                        teamId: id,
                        teamName: id === 147 ? 'NYY' : 'BOS',
                        teamAbbreviation: id === 147 ? 'NYY' : 'BOS',
                        birthDate: null,
                        age: null,
                        bats: null,
                        throws: null,
                        jerseyNumber: null,
                        photoUrl: null,
                        active: true,
                    },
                ]),
            ),
        }
        const openai = buildOpenAI(validOutput)
        const feature = new TeamBuilderAutofillFeature(openai, sports as ISportsProvider)
        await feature.invoke('u1', {
            mlbTeamIds: [147, 111, 147],
            salaryCap: 60000,
        })
        // Deduped: 147 only fetched once
        expect(sports.getPlayersByTeam).toHaveBeenCalledTimes(2)
        const opts = (openai.complete as ReturnType<typeof vi.fn>).mock.calls[0][0]
        // Both team names made it into the prompt input payload.
        expect(opts.input).toContain('New York Yankees')
        expect(opts.input).toContain('Boston Red Sox')
        // Both players appear in the merged pool with their teamName tag.
        expect(opts.input).toContain('Yankee Bat')
        expect(opts.input).toContain('Sox Bat')
    })
})
