import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_SCORING_RULES, DEFAULT_SLOT_CONFIG } from '@/shared/team-builder'

import type { ProviderPlayer } from '../../../../providers/dto/provider-player.dto'
import type { IProjectionsService } from '../../../projections/projections.service.interface'
import type { Projection } from '../../../projections/projections.type'
import type { IOpenAIProvider } from '../../provider/openai.provider'
import { TeamBuilderAutofillFeature, tbAutofillInputSchema } from '../../features/team-builder-autofill.feature'

const roster: Array<[number, string, ProviderPlayer['primaryPosition'], number | null]> = [
    [1, 'Pitcher', 'SP', 30], [2, 'Catcher', 'C', 20], [3, 'First', '1B', 22], [4, 'Second', '2B', 19],
    [5, 'Third', '3B', 21], [6, 'Short', 'SS', 25], [7, 'OF One', 'OF', 18], [8, 'OF Two', 'OF', 17],
    [9, 'OF Three', 'OF', 16], [10, 'OF Four', 'OF', 15],
]

const projectionsFor = (rows: typeof roster): IProjectionsService => ({
    projectTeams: vi.fn().mockResolvedValue({
        basis: 'schedule',
        players: rows.map(([id, fullName, primaryPosition]) => ({ id, fullName, primaryPosition, active: true, teamName: 'NYY', teamAbbreviation: 'NYY', photoUrl: null })),
        projections: Object.fromEntries(
            rows.map(([id, , , points]) => [id, { points, games: 6, starts: 0, confidence: 'normal', basis: 'schedule' } satisfies Projection]),
        ),
    }),
})

const openai = (): IOpenAIProvider => ({
    complete: vi.fn().mockResolvedValue({
        output: { explanation: 'Best projected points at each slot.' },
        tokenUsage: { inputTokens: 200, outputTokens: 100 },
        modelUsed: 'gpt-test',
    }),
})

const input = {
    mlbTeamIds: [147],
    format: 'H2H_POINTS' as const,
    period: 'WEEK' as const,
    rules: DEFAULT_SCORING_RULES,
    slotConfig: DEFAULT_SLOT_CONFIG,
}

describe('TeamBuilderAutofillFeature', () => {
    it('fills an empty 9-slot lineup with the best projected players', async () => {
        const feature = new TeamBuilderAutofillFeature(openai(), projectionsFor(roster))

        const { output } = await feature.invoke('u1', input)

        expect(output.suggestedPicks).toHaveLength(9)
        expect(output.unfilled).toEqual([])
        // OF slots take the three best outfielders, not the fourth.
        const outfielders = output.suggestedPicks.filter((pick) => pick.slotId.startsWith('OF')).map((pick) => pick.externalPlayerId)
        expect(outfielders.sort()).toEqual([7, 8, 9])
        expect(output.explanation).toBe('Best projected points at each slot.')
        // Picks carry what the client needs to show them without loading rosters.
        expect(output.suggestedPicks.find((pick) => pick.externalPlayerId === 6)).toMatchObject({ position: 'SS', teamName: 'NYY', playerName: 'Short' })
    })

    it('keeps two hand-picked players on their slots and fills the rest', async () => {
        const feature = new TeamBuilderAutofillFeature(openai(), projectionsFor(roster))

        const { output } = await feature.invoke('u1', {
            ...input,
            filledSlots: [
                { slotId: 'OF:0', externalPlayerId: 10 },
                { slotId: 'SS:0', externalPlayerId: 6 },
            ],
        })

        const slots = output.suggestedPicks.map((pick) => pick.slotId)
        expect(slots).not.toContain('OF:0')
        expect(slots).not.toContain('SS:0')
        expect(output.suggestedPicks).toHaveLength(7)
        expect(output.suggestedPicks.map((pick) => pick.externalPlayerId)).not.toContain(10)
    })

    it('reports a slot nobody can fill and still returns the rest', async () => {
        const feature = new TeamBuilderAutofillFeature(openai(), projectionsFor(roster.filter(([, , pos]) => pos !== 'SS')))

        const { output } = await feature.invoke('u1', input)

        expect(output.unfilled).toMatchObject([{ slotId: 'SS:0', code: 'NO_ELIGIBLE_PLAYER' }])
        expect(output.suggestedPicks).toHaveLength(8)
    })

    it('uses the cheap tier and only asks the model for an explanation', async () => {
        const provider = openai()
        await new TeamBuilderAutofillFeature(provider, projectionsFor(roster)).invoke('u1', input)

        const opts = (provider.complete as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(opts.tier).toBe('cheap')
        expect(opts.schemaName).toBe('TBAutofillOutput')
    })

    it('input schema needs a team, a supported format and valid slot ids', () => {
        expect(tbAutofillInputSchema.safeParse({ ...input, mlbTeamIds: [] }).success).toBe(false)
        expect(tbAutofillInputSchema.safeParse({ ...input, format: 'ROTO' }).success).toBe(false)
        expect(tbAutofillInputSchema.safeParse({ ...input, filledSlots: [{ slotId: 'LF', externalPlayerId: 1 }] }).success).toBe(false)
        expect(tbAutofillInputSchema.safeParse(input).success).toBe(true)
    })
})
