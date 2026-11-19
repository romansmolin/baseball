// team_builder_autofill — "Generate with AI" in the team builder. Fills the
// empty slots of a lineup (empty or partly built by hand) with the players
// that maximise projected points under the league's scoring rules.
//
// The lineup is chosen deterministically (optimizeLineup) from the same
// projections the player pool shows, so it is valid by construction: right
// positions, no duplicates, hand-picked players untouched. The cheap model
// only writes the explanation. 3 cr keeps iteration fast.

import { DEFAULT_CATEGORIES, buildSlots, slotAcceptsPoolPosition } from '../../../../src/shared/team-builder'
import type { CategoryKey } from '../../../../src/shared/team-builder'
import type { PoolPosition } from '../../../../src/shared/team-builder'
import {
    tbAutofillExplanationSchema,
    tbAutofillInputSchema,
    tbAutofillOutputSchema,
} from '../../../entities/ai/team-builder-autofill.schema'
import type { TBAutofillInput, TBAutofillOutput } from '../../../entities/ai/team-builder-autofill.schema'
import type { ProviderPlayer } from '../../../providers/dto/provider-player.dto'
import type { IProjectionsService } from '../../projections/projections.service.interface'
import { AI_FEATURE_KEYS } from '../types'
import type { AIFeatureKey, AIFeatureModule, AIInvocationResult } from '../types'
import type { IOpenAIProvider } from '../provider/openai.provider'
import { buildTBAutofillPrompt } from '../prompts/team-builder-autofill.prompt'

import { planCategoryLineup } from './category-lineup'
import { optimizeLineup } from './optimize-lineup'
import type { OptimizerPlayer } from './optimize-lineup'

export { tbAutofillInputSchema, tbAutofillOutputSchema }
export type { TBAutofillInput, TBAutofillOutput }

function poolPosition(player: ProviderPlayer): PoolPosition {
    if (player.primaryPosition === 'SP' || player.primaryPosition === 'RP') return 'P'
    if (player.primaryPosition === 'DH') return 'OF'
    return player.primaryPosition
}

export class TeamBuilderAutofillFeature
    implements AIFeatureModule<TBAutofillInput, TBAutofillOutput>
{
    readonly key: AIFeatureKey = AI_FEATURE_KEYS.TEAM_BUILDER_AUTOFILL
    readonly inputSchema = tbAutofillInputSchema
    readonly outputSchema = tbAutofillOutputSchema

    private readonly provider: IOpenAIProvider
    private readonly projections: IProjectionsService

    constructor(provider: IOpenAIProvider, projections: IProjectionsService) {
        this.provider = provider
        this.projections = projections
    }

    async invoke(
        _userId: string,
        input: TBAutofillInput,
    ): Promise<AIInvocationResult<TBAutofillOutput>> {
        const parsed = this.inputSchema.parse(input)
        const filledSlots = parsed.filledSlots ?? []
        const salaryCap = parsed.salaryCap ?? null

        const { basis, projections, scales, players } = await this.projections.projectTeams({
            league: parsed.league,
            teamIds: [...new Set(parsed.mlbTeamIds)],
            period: parsed.period,
            rules: parsed.rules,
        })

        const byId = new Map(players.map((player) => [player.id, player]))
        const pool: OptimizerPlayer[] = players.map((player) => ({
            id: player.id,
            name: player.fullName,
            pos: poolPosition(player),
            points: projections[player.id]?.points ?? null,
            salary: null,
            available: player.active,
        }))

        const slots = buildSlots(parsed.slotConfig)
        const pinned = filledSlots.map((slot) => ({
            slotId: slot.slotId,
            playerId: slot.externalPlayerId,
            salary: null,
        }))
        const categories: CategoryKey[] | null = parsed.format === 'H2H_POINTS' ? null : (parsed.categories ?? DEFAULT_CATEGORIES)

        // Points formats pick on projected points; categories formats on weighted
        // category strength. Both are valid by construction.
        const planned = categories
            ? planCategoryLineup({
                  slots,
                  pinned,
                  pool: pool.map((player) => ({ ...player, stats: projections[player.id]?.stats ?? null })),
                  scales,
                  categories,
                  salaryCap,
              })
            : null
        const result = planned ?? optimizeLineup({ slots, pinned, pool, salaryCap })
        const scoreOf = (playerId: number) => planned?.scores[playerId] ?? pool.find((p) => p.id === playerId)?.points ?? 0
        const topCategories = (playerId: number) =>
            Object.entries(planned?.values[playerId] ?? {})
                .filter(([, value]) => (value as number) > 0)
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .slice(0, 2)
                .map(([key]) => key)

        const labelOf = (slotId: string) => slots.find((slot) => slot.id === slotId)?.label ?? slotId
        const poolById = new Map(pool.map((player) => [player.id, player]))
        const suggestedPicks = result.picks.flatMap((pick) => {
            const player = byId.get(pick.playerId)
            if (!player) return []
            return [{
                slotId: pick.slotId,
                externalPlayerId: pick.playerId,
                playerName: player.fullName,
                projectedPoints: projections[pick.playerId]?.points ?? 0,
                score: Math.round(scoreOf(pick.playerId) * 100) / 100,
                position: poolPosition(player),
                teamName: player.teamAbbreviation ?? player.teamName ?? '—',
                photoUrl: player.photoUrl,
            }]
        })

        const pickedIds = new Set(result.picks.map((pick) => pick.playerId))
        const { instructions, input: serialized } = buildTBAutofillPrompt({
            nowIso: new Date().toISOString(),
            period: parsed.period,
            basis,
            rules: parsed.rules,
            categories,
            pinned: filledSlots.map((slot) => ({
                slotLabel: labelOf(slot.slotId),
                playerName: byId.get(slot.externalPlayerId)?.fullName ?? `Player ${slot.externalPlayerId}`,
                projectedPoints: projections[slot.externalPlayerId]?.points ?? null,
            })),
            picks: result.picks.map((pick) => {
                const player = byId.get(pick.playerId)
                return {
                    slotLabel: labelOf(pick.slotId),
                    playerName: player?.fullName ?? `Player ${pick.playerId}`,
                    position: player ? poolPosition(player) : '',
                    teamName: player?.teamName ?? '',
                    projectedPoints: projections[pick.playerId]?.points ?? 0,
                    score: Math.round(scoreOf(pick.playerId) * 100) / 100,
                    topCategories: topCategories(pick.playerId),
                }
            }),
            unfilled: result.unfilled.map((slot) => ({ slotLabel: labelOf(slot.slotId), message: slot.message })),
            notPicked: pool
                .filter((player) => player.points !== null && !pickedIds.has(player.id))
                .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
                .slice(0, 5)
                .map((player) => ({ playerName: player.name, position: player.pos, projectedPoints: player.points ?? 0 })),
        })

        const completion = await this.provider.complete({
            tier: 'cheap',
            instructions,
            input: serialized,
            outputSchema: tbAutofillExplanationSchema,
            schemaName: 'TBAutofillOutput',
            maxOutputTokens: 6000,
        })

        // Eligibility is checked again here so a bug in the optimizer can never
        // hand the client an ineligible pick.
        const safePicks = suggestedPicks.filter((pick) => {
            const player = poolById.get(pick.externalPlayerId)
            return player != null && slotAcceptsPoolPosition(pick.slotId, player.pos)
        })

        return {
            ...completion,
            output: {
                suggestedPicks: safePicks,
                unfilled: result.unfilled,
                explanation: completion.output.explanation,
                totalPoints: result.totalPoints,
                basis,
            },
        }
    }
}
