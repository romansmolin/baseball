// lineup_optimizer feature, re-spec'd for this codebase.
//
// The original task assumed a Contest table with a slate of games and a
// per-contest salaryCap. That table was dropped — see migration
// 20260601181710_drop_contests_consolidate_on_tournaments. We now operate
// against a season-long League (tournament): user picks a tournament, we
// pull the league's scoring rule, build a player pool from teams playing
// this week, and ask the model to fit a 9-slot lineup under the default
// $60k cap.
//
// Player salary/projection: there is no real pricing source yet, so we
// mirror the team builder's deterministic faux formula
// (3000 + (id % 8) * 1000, proj 8 + (id % 13) * 0.7) so the AI's picks
// line up with what the user sees in the team-builder UI.

import { z } from 'zod'

import { RosterSlotPosition } from '../../../../src/generated/prisma/enums'
import type { ISportsProvider } from '../../../providers/sports-provider.interface'
import type { ILeagueRepository } from '../../../repositories/league/league.repository.interface'
import type { IScoringRuleRepository } from '../../../repositories/scoring-rule/scoring-rule.repository.interface'
import { SALARY_CAP_DEFAULT } from '../../../../src/shared/team-builder/types'

import { AI_FEATURE_KEYS } from '../types'
import type { AIFeatureModule, AIInvocationResult } from '../types'
import type { IOpenAIProvider } from '../provider/openai.provider'
import { buildLineupOptimizerPrompt } from '../prompts/lineup-optimizer.prompt'
import type { LineupOptimizerPromptPlayer } from '../prompts/lineup-optimizer.prompt'

export const lineupOptimizerInputSchema = z.object({
    tournamentId: z.string().min(1),
    excludePlayerIds: z.array(z.string()).optional(),
    preferredPlayerIds: z.array(z.string()).optional(),
    riskProfile: z.enum(['safe', 'balanced', 'high_ceiling']).optional(),
})
export type LineupOptimizerInput = z.infer<typeof lineupOptimizerInputSchema>

export const lineupOptimizerOutputSchema = z.object({
    suggestedLineup: z
        .array(
            z.object({
                rosterSlotPosition: z.enum([
                    RosterSlotPosition.P,
                    RosterSlotPosition.C,
                    RosterSlotPosition.FIRST_BASE,
                    RosterSlotPosition.SECOND_BASE,
                    RosterSlotPosition.THIRD_BASE,
                    RosterSlotPosition.SS,
                    RosterSlotPosition.OF,
                    RosterSlotPosition.UTIL,
                    RosterSlotPosition.BENCH,
                ]),
                externalPlayerId: z.string(),
                playerName: z.string(),
                salary: z.number(),
                projectedPoints: z.number(),
                reasoning: z.string(),
            }),
        )
        .min(1),
    totalSalary: z.number(),
    totalProjectedPoints: z.number(),
    overallStrategy: z.string(),
    confidenceScore: z.number().min(0).max(1),
})
export type LineupOptimizerOutput = z.infer<typeof lineupOptimizerOutputSchema>

const ROSTER_SLOT_ORDER = [
    RosterSlotPosition.P,
    RosterSlotPosition.C,
    RosterSlotPosition.FIRST_BASE,
    RosterSlotPosition.SECOND_BASE,
    RosterSlotPosition.THIRD_BASE,
    RosterSlotPosition.SS,
    RosterSlotPosition.OF,
    RosterSlotPosition.OF,
    RosterSlotPosition.OF,
] as const

const SCHEDULE_WINDOW_DAYS = 3
const MAX_TEAMS = 8
const MAX_PLAYERS_PER_TEAM = 8

export class LineupOptimizerFeature
    implements AIFeatureModule<LineupOptimizerInput, LineupOptimizerOutput>
{
    readonly key = AI_FEATURE_KEYS.LINEUP_OPTIMIZER
    readonly inputSchema = lineupOptimizerInputSchema
    readonly outputSchema = lineupOptimizerOutputSchema

    private readonly provider: IOpenAIProvider
    private readonly sportsProvider: ISportsProvider
    private readonly leagueRepo: ILeagueRepository
    private readonly scoringRuleRepo: IScoringRuleRepository

    constructor(
        provider: IOpenAIProvider,
        sportsProvider: ISportsProvider,
        leagueRepo: ILeagueRepository,
        scoringRuleRepo: IScoringRuleRepository,
    ) {
        this.provider = provider
        this.sportsProvider = sportsProvider
        this.leagueRepo = leagueRepo
        this.scoringRuleRepo = scoringRuleRepo
    }

    async invoke(
        _userId: string,
        input: LineupOptimizerInput,
    ): Promise<AIInvocationResult<LineupOptimizerOutput>> {
        const parsed = this.inputSchema.parse(input)
        const exclude = new Set(parsed.excludePlayerIds ?? [])
        const preferred = new Set(parsed.preferredPlayerIds ?? [])
        const riskProfile = parsed.riskProfile ?? 'balanced'

        const tournament = await this.leagueRepo.findById(parsed.tournamentId)
        if (!tournament) {
            throw new Error(`Tournament ${parsed.tournamentId} not found`)
        }

        const scoringRule = await this.scoringRuleRepo.findByLeagueId(
            parsed.tournamentId,
        )
        if (!scoringRule) {
            throw new Error(`No scoring rule for tournament ${parsed.tournamentId}`)
        }

        const pool = await this.buildPool(exclude, preferred)
        if (pool.length === 0) {
            throw new Error('Player pool is empty after filtering')
        }

        const { instructions, input: serialized } = buildLineupOptimizerPrompt({
            nowIso: new Date().toISOString(),
            tournamentName: tournament.name,
            salaryCap: SALARY_CAP_DEFAULT,
            rosterSlots: [...ROSTER_SLOT_ORDER],
            scoringRuleSummary: scoringRule.rule as unknown as Record<string, number>,
            riskProfile,
            pool,
        })

        return this.provider.complete({
            tier: 'complex_reasoning',
            instructions,
            input: serialized,
            outputSchema: this.outputSchema,
            schemaName: 'LineupOptimizerOutput',
            // Bound output size — a 9-slot lineup with reasoning should fit
            // comfortably under 2k tokens; cap higher to give the model
            // breathing room without going unbounded.
            maxOutputTokens: 4000,
        })
    }

    // Pulls a representative player pool by finding the most recently
    // active teams and grabbing their rosters. Caps team and per-team
    // player counts so the prompt stays bounded.
    private async buildPool(
        excludeIds: Set<string>,
        preferredIds: Set<string>,
    ): Promise<LineupOptimizerPromptPlayer[]> {
        const now = new Date()
        const start = new Date(
            now.getTime() - SCHEDULE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
        )
        const end = new Date(
            now.getTime() + SCHEDULE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
        )
        const schedule = await this.sportsProvider.getSchedule({
            startDateUtc: start,
            endDateUtc: end,
        })
        const teamIds = new Set<number>()
        for (const game of schedule) {
            teamIds.add(game.homeTeamId)
            teamIds.add(game.awayTeamId)
            if (teamIds.size >= MAX_TEAMS) break
        }

        const rosters = await Promise.all(
            Array.from(teamIds)
                .slice(0, MAX_TEAMS)
                .map((id) => this.sportsProvider.getPlayersByTeam(id)),
        )

        const players: LineupOptimizerPromptPlayer[] = []
        for (const roster of rosters) {
            for (const p of roster.slice(0, MAX_PLAYERS_PER_TEAM)) {
                const idStr = String(p.id)
                if (excludeIds.has(idStr)) continue
                const { salary, proj } = fauxSalaryAndProjection(p.id)
                players.push({
                    externalPlayerId: p.id,
                    fullName: p.fullName,
                    primaryPosition: p.primaryPosition,
                    teamName: p.teamName,
                    salary,
                    projectedPoints: proj,
                    preferred: preferredIds.has(idStr),
                })
            }
        }
        return players
    }
}

// Mirrors src/entities/team-builder/api/catalog/fetch-players-by-team.ts so
// AI-suggested salaries match what the team-builder UI shows for the same
// player. Replace alongside the team-builder when real pricing lands.
function fauxSalaryAndProjection(id: number): { salary: number; proj: number } {
    const absId = Math.abs(id)
    const salary = 3000 + (absId % 8) * 1000
    const proj = Number((8 + (absId % 13) * 0.7).toFixed(1))
    return { salary, proj }
}
