// team_builder_autofill — wires the team-builder's Autofill button to the
// AI. Takes the MLB teams the user picked in the Autofill modal plus
// whatever slots they've already filled by hand, and asks the model to
// suggest picks for the remaining empty slots within the salary cap.
//
// Cheap tier — even with multiple teams the decision space is still small
// relative to a free-form draft. The user can press the button repeatedly;
// 3 cr is intentionally low to keep iteration fast.
//
// Salary + projection use the same faux formula the team-builder UI uses
// (3000 + (id % 8) * 1000, proj 8 + (id % 13) * 0.7) so the numbers the
// AI sees match what the user sees in the player pool.

import { z } from 'zod'

import type { ISportsProvider } from '../../../providers/sports-provider.interface'

import { AI_FEATURE_KEYS } from '../types'
import type { AIFeatureKey, AIFeatureModule, AIInvocationResult } from '../types'
import type { IOpenAIProvider } from '../provider/openai.provider'
import { buildTBAutofillPrompt } from '../prompts/team-builder-autofill.prompt'
import type { TBAutofillPromptPlayer } from '../prompts/team-builder-autofill.prompt'

// Slot keys mirror src/shared/team-builder/types.ts FIELD_SLOTS so the
// frontend can pass them through unchanged. We accept the team-builder's
// shorthand, not the DB enum.
const SLOT_KEY_SCHEMA = z.enum([
    'P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF',
])

export const tbAutofillInputSchema = z.object({
    // Candidate pool: union of these MLB teams' rosters. At least one
    // required. Deduped server-side so a repeated id is harmless.
    mlbTeamIds: z.array(z.number().int().positive()).min(1),
    salaryCap: z.number().int().positive(),
    riskProfile: z.enum(['safe', 'balanced', 'high_ceiling']).optional(),
    // Slots already filled by the user — these stay as-is. Pass the
    // externalPlayerId so we can subtract their salaries from the cap.
    filledSlots: z
        .array(
            z.object({
                slotKey: SLOT_KEY_SCHEMA,
                externalPlayerId: z.number().int().positive(),
            }),
        )
        .optional(),
})
export type TBAutofillInput = z.infer<typeof tbAutofillInputSchema>

export const tbAutofillOutputSchema = z.object({
    suggestedPicks: z.array(
        z.object({
            slotKey: SLOT_KEY_SCHEMA,
            externalPlayerId: z.number().int().positive(),
            playerName: z.string(),
            reasoning: z.string(),
        }),
    ),
    strategy: z.string(),
    salaryUsed: z.number().int().nonnegative(),
})
export type TBAutofillOutput = z.infer<typeof tbAutofillOutputSchema>

const ALL_SLOT_KEYS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const

export class TeamBuilderAutofillFeature
    implements AIFeatureModule<TBAutofillInput, TBAutofillOutput>
{
    readonly key: AIFeatureKey = AI_FEATURE_KEYS.TEAM_BUILDER_AUTOFILL
    readonly inputSchema = tbAutofillInputSchema
    readonly outputSchema = tbAutofillOutputSchema

    private readonly provider: IOpenAIProvider
    private readonly sportsProvider: ISportsProvider

    constructor(provider: IOpenAIProvider, sportsProvider: ISportsProvider) {
        this.provider = provider
        this.sportsProvider = sportsProvider
    }

    async invoke(
        _userId: string,
        input: TBAutofillInput,
    ): Promise<AIInvocationResult<TBAutofillOutput>> {
        const parsed = this.inputSchema.parse(input)
        const filledSlots = parsed.filledSlots ?? []

        // Dedupe ids — caller can repeat; we'd otherwise fetch the same
        // roster twice. Order is preserved by Set iteration.
        const uniqueTeamIds = [...new Set(parsed.mlbTeamIds)]

        // Parallel roster + team lookups. One failed team shouldn't block
        // the others — we keep what we can and surface team names from the
        // teams we successfully looked up.
        const [rostersPerTeam, teamsPerId] = await Promise.all([
            Promise.all(
                uniqueTeamIds.map((id) => this.sportsProvider.getPlayersByTeam(id)),
            ),
            Promise.all(
                uniqueTeamIds.map((id) => this.sportsProvider.getTeamById(id)),
            ),
        ])

        const teamNameById = new Map<number, string>()
        uniqueTeamIds.forEach((id, i) => {
            teamNameById.set(id, teamsPerId[i]?.name ?? `Team ${id}`)
        })

        const filledIds = new Set(filledSlots.map((s) => s.externalPlayerId))
        const filledSalary = filledSlots.reduce((sum, slot) => {
            const { salary } = fauxSalaryAndProjection(slot.externalPlayerId)
            return sum + salary
        }, 0)
        const salaryRemaining = parsed.salaryCap - filledSalary

        // Merge + dedupe players across teams. If the same player happens to
        // appear in two rosters (shouldn't, but cheap to guard) the first
        // team wins for `teamName`.
        const poolById = new Map<number, TBAutofillPromptPlayer>()
        uniqueTeamIds.forEach((teamId, i) => {
            const roster = rostersPerTeam[i]
            const teamName = teamNameById.get(teamId) ?? `Team ${teamId}`
            for (const p of roster) {
                if (poolById.has(p.id)) continue
                const { salary, proj } = fauxSalaryAndProjection(p.id)
                poolById.set(p.id, {
                    externalPlayerId: p.id,
                    fullName: p.fullName,
                    primaryPosition: p.primaryPosition,
                    teamName,
                    salary,
                    projectedPoints: proj,
                    available: !filledIds.has(p.id) && p.active,
                })
            }
        })
        const pool: TBAutofillPromptPlayer[] = [...poolById.values()]

        const filledSlotKeys = new Set(filledSlots.map((s) => s.slotKey))
        const emptySlotKeys = ALL_SLOT_KEYS.filter((k) => !filledSlotKeys.has(k))

        const { instructions, input: serialized } = buildTBAutofillPrompt({
            nowIso: new Date().toISOString(),
            mlbTeamNames: uniqueTeamIds.map(
                (id) => teamNameById.get(id) ?? `Team ${id}`,
            ),
            salaryCap: parsed.salaryCap,
            salaryRemaining,
            riskProfile: parsed.riskProfile ?? 'balanced',
            emptySlotKeys: [...emptySlotKeys],
            filledSlots: filledSlots.map((s) => ({
                ...s,
                salary: fauxSalaryAndProjection(s.externalPlayerId).salary,
            })),
            pool,
        })

        return this.provider.complete({
            tier: 'cheap',
            instructions,
            input: serialized,
            outputSchema: this.outputSchema,
            schemaName: 'TBAutofillOutput',
            maxOutputTokens: 2000,
        })
    }
}

function fauxSalaryAndProjection(id: number): { salary: number; proj: number } {
    const absId = Math.abs(id)
    const salary = 3000 + (absId % 8) * 1000
    const proj = Number((8 + (absId % 13) * 0.7).toFixed(1))
    return { salary, proj }
}
