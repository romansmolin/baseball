// trade_advisor feature. Evaluates a hypothetical trade on an outside fantasy
// platform — pure advisory. The user supplies the players they'd give and
// receive (by external id), the scoring style of their league, and optionally
// one of their saved teams for roster context; we ask the model for a verdict
// + fairness score.
//
// Complex-reasoning tier — multi-player valuation + counter-proposal
// generation warrants the more capable model.

import { z } from 'zod'

import { SCORING_PRESETS } from '../../../../src/shared/team-builder'

import type { ISportsProvider } from '../../../providers/sports-provider.interface'
import type { IFantasyTeamRepository } from '../../../repositories/fantasy-team/fantasy-team.repository.interface'

import { AI_FEATURE_KEYS } from '../types'
import type { AIFeatureModule, AIInvocationResult } from '../types'
import type { IOpenAIProvider } from '../provider/openai.provider'
import { buildTradeAdvisorPrompt } from '../prompts/trade-advisor.prompt'
import type { TradeAdvisorPromptContext } from '../prompts/trade-advisor.prompt'

export const tradeAdvisorInputSchema = z.object({
    teamId: z.string().min(1).optional(),
    scoringPreset: z.enum(SCORING_PRESETS).default('POINTS'),
    giving: z.array(z.string().min(1)).min(1),
    receiving: z.array(z.string().min(1)).min(1),
})
export type TradeAdvisorInput = z.input<typeof tradeAdvisorInputSchema>

export const tradeAdvisorOutputSchema = z.object({
    verdict: z.enum(['accept', 'decline', 'counter']),
    fairnessScore: z.number().min(-1).max(1),
    givingValue: z.number(),
    receivingValue: z.number(),
    teamFitImpact: z.string(),
    keyRisks: z.array(z.string()),
    keyUpsides: z.array(z.string()),
    counterProposal: z
        .object({
            give: z.array(z.string()),
            receive: z.array(z.string()),
            rationale: z.string(),
        })
        .optional(),
    summary: z.string(),
})
export type TradeAdvisorOutput = z.infer<typeof tradeAdvisorOutputSchema>

export class TradeAdvisorFeature
    implements AIFeatureModule<TradeAdvisorInput, TradeAdvisorOutput>
{
    readonly key = AI_FEATURE_KEYS.TRADE_ADVISOR
    readonly inputSchema = tradeAdvisorInputSchema
    readonly outputSchema = tradeAdvisorOutputSchema

    private readonly provider: IOpenAIProvider
    private readonly sportsProvider: ISportsProvider
    private readonly fantasyTeamRepo: IFantasyTeamRepository

    constructor(
        provider: IOpenAIProvider,
        sportsProvider: ISportsProvider,
        fantasyTeamRepo: IFantasyTeamRepository,
    ) {
        this.provider = provider
        this.sportsProvider = sportsProvider
        this.fantasyTeamRepo = fantasyTeamRepo
    }

    async invoke(
        userId: string,
        input: TradeAdvisorInput,
    ): Promise<AIInvocationResult<TradeAdvisorOutput>> {
        const parsed = this.inputSchema.parse(input)

        let userRoster: TradeAdvisorPromptContext['userRoster'] = []
        if (parsed.teamId) {
            const team = await this.fantasyTeamRepo.findById(parsed.teamId)
            if (!team) throw new Error(`Team ${parsed.teamId} not found`)
            if (team.userId !== userId) {
                throw new Error(`Team ${parsed.teamId} is not owned by this user`)
            }
            userRoster = team.rosterSlots.map((s) => ({
                externalPlayerId: s.externalPlayerId,
                playerName: s.playerName,
                slotPosition: String(s.slotPosition),
                playerPosition: String(s.playerPosition),
            }))
        }

        const givingPlayers = await this.lookupPlayers(parsed.giving)
        const receivingPlayers = await this.lookupPlayers(parsed.receiving)

        const { instructions, input: serialized } = buildTradeAdvisorPrompt({
            nowIso: new Date().toISOString(),
            scoringPreset: parsed.scoringPreset,
            userRoster,
            giving: givingPlayers,
            receiving: receivingPlayers,
        })

        return this.provider.complete({
            tier: 'complex_reasoning',
            instructions,
            input: serialized,
            outputSchema: this.outputSchema,
            schemaName: 'TradeAdvisorOutput',
        })
    }

    private async lookupPlayers(externalIds: string[]) {
        const players = await Promise.all(
            externalIds.map(async (idStr) => {
                const id = Number(idStr)
                if (!Number.isFinite(id)) {
                    throw new Error(`Player id must be numeric (got ${idStr})`)
                }
                const p = await this.sportsProvider.getPlayerById(id)
                if (!p) throw new Error(`Player ${id} not found`)
                return {
                    externalPlayerId: p.id,
                    fullName: p.fullName,
                    primaryPosition: p.primaryPosition,
                    teamName: p.teamName,
                }
            }),
        )
        return players
    }
}
