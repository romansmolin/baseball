// trade_advisor feature. Evaluates a hypothetical trade — no Trade table
// exists in this codebase, so this is pure advisory. The user supplies the
// league they're in plus the players they'd give and receive (by external
// id); we pull the league's scoring rule and their current roster for
// context and ask the model for a verdict + fairness score.
//
// Complex-reasoning tier — multi-player valuation + counter-proposal
// generation warrants the more capable model.

import { z } from 'zod'

import type { ISportsProvider } from '../../../providers/sports-provider.interface'
import type { IFantasyTeamRepository } from '../../../repositories/fantasy-team/fantasy-team.repository.interface'
import type { ILeagueRepository } from '../../../repositories/league/league.repository.interface'
import type { ILeagueMemberRepository } from '../../../repositories/league-member/league-member.repository.interface'
import type { IScoringRuleRepository } from '../../../repositories/scoring-rule/scoring-rule.repository.interface'

import { AI_FEATURE_KEYS } from '../types'
import type { AIFeatureModule, AIInvocationResult } from '../types'
import type { IOpenAIProvider } from '../provider/openai.provider'
import { buildTradeAdvisorPrompt } from '../prompts/trade-advisor.prompt'

export const tradeAdvisorInputSchema = z.object({
    leagueId: z.string().min(1),
    giving: z.array(z.string().min(1)).min(1),
    receiving: z.array(z.string().min(1)).min(1),
})
export type TradeAdvisorInput = z.infer<typeof tradeAdvisorInputSchema>

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
    private readonly leagueRepo: ILeagueRepository
    private readonly leagueMemberRepo: ILeagueMemberRepository
    private readonly scoringRuleRepo: IScoringRuleRepository
    private readonly fantasyTeamRepo: IFantasyTeamRepository

    constructor(
        provider: IOpenAIProvider,
        sportsProvider: ISportsProvider,
        leagueRepo: ILeagueRepository,
        leagueMemberRepo: ILeagueMemberRepository,
        scoringRuleRepo: IScoringRuleRepository,
        fantasyTeamRepo: IFantasyTeamRepository,
    ) {
        this.provider = provider
        this.sportsProvider = sportsProvider
        this.leagueRepo = leagueRepo
        this.leagueMemberRepo = leagueMemberRepo
        this.scoringRuleRepo = scoringRuleRepo
        this.fantasyTeamRepo = fantasyTeamRepo
    }

    async invoke(
        userId: string,
        input: TradeAdvisorInput,
    ): Promise<AIInvocationResult<TradeAdvisorOutput>> {
        const parsed = this.inputSchema.parse(input)

        const league = await this.leagueRepo.findById(parsed.leagueId)
        if (!league) throw new Error(`League ${parsed.leagueId} not found`)

        const scoringRule = await this.scoringRuleRepo.findByLeagueId(
            parsed.leagueId,
        )
        if (!scoringRule) {
            throw new Error(`No scoring rule for league ${parsed.leagueId}`)
        }
        const scoringRuleSummary =
            scoringRule.rule as unknown as Record<string, number>

        // Locate the user's membership + their fantasy roster (if any). Not
        // strictly required — the user might be evaluating a trade before
        // they've joined — so we keep an empty roster fallback.
        const memberships = await this.leagueMemberRepo.findByUserId(userId)
        const membership = memberships.find((m) => m.leagueId === parsed.leagueId)
        let userRoster: Array<{
            externalPlayerId: number
            playerName: string
            slotPosition: string
            playerPosition: string
        }> = []
        if (membership) {
            const team = await this.fantasyTeamRepo.findByLeagueMemberId(
                membership.id,
            )
            if (team) {
                userRoster = team.rosterSlots.map((s) => ({
                    externalPlayerId: s.externalPlayerId,
                    playerName: s.playerName,
                    slotPosition: String(s.slotPosition),
                    playerPosition: String(s.playerPosition),
                }))
            }
        }

        const givingPlayers = await this.lookupPlayers(parsed.giving)
        const receivingPlayers = await this.lookupPlayers(parsed.receiving)

        const { instructions, input: serialized } = buildTradeAdvisorPrompt({
            nowIso: new Date().toISOString(),
            leagueName: league.name,
            scoringRuleSummary,
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
