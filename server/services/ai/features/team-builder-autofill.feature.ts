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

import { baseballLeagueEnum } from '../../../entities/baseball-league.schema'
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
    // Which baseball league the team ids below belong to (MLB or a MiLB
    // level). Defaults to MLB when omitted so older callers keep working.
    league: baseballLeagueEnum.optional(),
    // Candidate pool: union of these teams' rosters, all within `league`. At
    // least one required. Deduped server-side so a repeated id is harmless.
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
        }),
    ),
    strategy: z.string(),
    salaryUsed: z.number().int().nonnegative(),
})
export type TBAutofillOutput = z.infer<typeof tbAutofillOutputSchema>

const ALL_SLOT_KEYS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const
type SlotKey = (typeof ALL_SLOT_KEYS)[number]

// Which normalized primaryPosition values each slot accepts. The pool carries
// the provider's Position enum ('SP'/'RP'/'C'/'1B'/'2B'/'3B'/'SS'/'OF'/'DH'),
// NOT raw baseball codes — so the pitcher slot matches SP/RP and the three
// outfield slots all match OF. 'DH' fits no slot.
function slotAcceptsPosition(slotKey: SlotKey, primaryPosition: string): boolean {
    switch (slotKey) {
        case 'P':
            return primaryPosition === 'SP' || primaryPosition === 'RP'
        case 'LF':
        case 'CF':
        case 'RF':
            return primaryPosition === 'OF'
        default:
            // C / 1B / 2B / 3B / SS — exact match.
            return primaryPosition === slotKey
    }
}

// Turns the model's suggestions into a complete, valid set of picks. The cheap
// model is unreliable at enumerating all 9 slots, so we treat its picks as
// preferences (good players per risk profile) and then deterministically
// backfill any slot it left empty from the available pool — cheapest eligible
// player first — so every fillable slot gets filled within the cap. This is
// the guarantee the model alone could not provide.
export function completeAutofill(args: {
    modelPicks: Array<{ slotKey: string; externalPlayerId: number }>
    emptySlotKeys: SlotKey[]
    pool: TBAutofillPromptPlayer[]
    salaryBudget: number
}): { suggestedPicks: TBAutofillOutput['suggestedPicks']; salaryUsed: number } {
    const { modelPicks, emptySlotKeys, pool, salaryBudget } = args
    const poolById = new Map(pool.map((p) => [p.externalPlayerId, p]))
    const emptySet = new Set<SlotKey>(emptySlotKeys)
    const assigned = new Map<SlotKey, number>()
    const usedPlayers = new Set<number>()
    let spent = 0

    const tryAssign = (slotKey: SlotKey, playerId: number): boolean => {
        if (assigned.has(slotKey)) return false
        const p = poolById.get(playerId)
        if (!p || !p.available || usedPlayers.has(playerId)) return false
        if (!slotAcceptsPosition(slotKey, p.primaryPosition)) return false
        if (spent + p.salary > salaryBudget) return false
        assigned.set(slotKey, playerId)
        usedPlayers.add(playerId)
        spent += p.salary
        return true
    }

    // 1) Honor the model's picks first. If a pick's slot is taken or invalid,
    //    try to reslot the player into any other eligible empty slot (handles
    //    the model labelling two outfielders with the same slotKey).
    for (const pick of modelPicks) {
        const sk = pick.slotKey as SlotKey
        if (emptySet.has(sk) && tryAssign(sk, pick.externalPlayerId)) continue
        for (const alt of emptySlotKeys) {
            if (tryAssign(alt, pick.externalPlayerId)) break
        }
    }

    // 2) Backfill every slot the model left empty, cheapest eligible first.
    const cheapestFirst = [...pool].sort((a, b) => a.salary - b.salary)
    for (const slotKey of emptySlotKeys) {
        if (assigned.has(slotKey)) continue
        for (const p of cheapestFirst) {
            if (tryAssign(slotKey, p.externalPlayerId)) break
        }
    }

    const suggestedPicks = [...assigned.entries()].map(([slotKey, id]) => {
        const p = poolById.get(id)!
        return { slotKey, externalPlayerId: id, playerName: p.fullName }
    })
    return { suggestedPicks, salaryUsed: spent }
}

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
                uniqueTeamIds.map((id) =>
                    this.sportsProvider.getPlayersByTeam(id, { league: parsed.league }),
                ),
            ),
            Promise.all(
                uniqueTeamIds.map((id) =>
                    this.sportsProvider.getTeamById(id, { league: parsed.league }),
                ),
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

        const result = await this.provider.complete({
            tier: 'cheap',
            instructions,
            input: serialized,
            outputSchema: this.outputSchema,
            schemaName: 'TBAutofillOutput',
            // Generous headroom so the model can emit picks for all 9 slots.
            // It still won't reliably fill every one — gpt-4o-mini is weak at
            // this constrained assignment — but that's fine: completeness is
            // guaranteed by completeAutofill() below, not by the model.
            maxOutputTokens: 6000,
        })

        // The model is unreliable at returning a pick for every empty slot, so
        // we deterministically complete the lineup from the same pool it saw.
        // Its picks are treated as preferences; the backfill is the actual
        // completeness guarantee.
        const completed = completeAutofill({
            modelPicks: result.output.suggestedPicks,
            emptySlotKeys: [...emptySlotKeys],
            pool,
            salaryBudget: salaryRemaining,
        })

        return {
            ...result,
            output: {
                ...result.output,
                suggestedPicks: completed.suggestedPicks,
                salaryUsed: completed.salaryUsed,
            },
        }
    }
}

function fauxSalaryAndProjection(id: number): { salary: number; proj: number } {
    const absId = Math.abs(id)
    const salary = 3000 + (absId % 8) * 1000
    const proj = Number((8 + (absId % 13) * 0.7).toFixed(1))
    return { salary, proj }
}
