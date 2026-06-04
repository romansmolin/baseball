// player_analysis feature. Default model tier. Fetches the player record,
// the last ~10 game box scores their team played, and the team's next
// scheduled game — assembles those into a single AI call that returns a
// "start / consider / avoid" recommendation with reasoning.

import { z } from 'zod'

import type { ISportsProvider } from '../../../providers/sports-provider.interface'

import { AI_FEATURE_KEYS } from '../types'
import type { AIFeatureModule, AIInvocationResult } from '../types'
import type { IOpenAIProvider } from '../provider/openai.provider'
import { buildPlayerAnalysisPrompt } from '../prompts/player-analysis.prompt'

export const playerAnalysisInputSchema = z.object({
    externalPlayerId: z.string().min(1),
    contextDate: z.string().datetime().optional(),
})
export type PlayerAnalysisInput = z.infer<typeof playerAnalysisInputSchema>

export const playerAnalysisOutputSchema = z.object({
    playerName: z.string(),
    currentForm: z.enum(['hot', 'cold', 'average']),
    recentTrend: z.string(),
    nextGameMatchup: z
        .object({
            opposingTeam: z.string(),
            opposingPitcher: z.string().nullable(),
            favorability: z.enum(['favorable', 'neutral', 'unfavorable']),
            notes: z.string(),
        })
        .nullable(),
    fantasyOutlook: z.string(),
    keyStats: z.array(z.object({ label: z.string(), value: z.string() })),
    recommendation: z.enum(['start', 'consider', 'avoid']),
})
export type PlayerAnalysisOutput = z.infer<typeof playerAnalysisOutputSchema>

const RECENT_GAMES_LOOKBACK_DAYS = 14
const NEXT_GAME_LOOKAHEAD_DAYS = 7
const MAX_RECENT_GAMES = 10

export class PlayerAnalysisFeature
    implements AIFeatureModule<PlayerAnalysisInput, PlayerAnalysisOutput>
{
    readonly key = AI_FEATURE_KEYS.PLAYER_ANALYSIS
    readonly inputSchema = playerAnalysisInputSchema
    readonly outputSchema = playerAnalysisOutputSchema

    private readonly provider: IOpenAIProvider
    private readonly sportsProvider: ISportsProvider

    constructor(provider: IOpenAIProvider, sportsProvider: ISportsProvider) {
        this.provider = provider
        this.sportsProvider = sportsProvider
    }

    async invoke(
        _userId: string,
        input: PlayerAnalysisInput,
    ): Promise<AIInvocationResult<PlayerAnalysisOutput>> {
        const parsed = this.inputSchema.parse(input)
        const playerId = Number(parsed.externalPlayerId)
        if (!Number.isFinite(playerId)) {
            throw new Error(
                `externalPlayerId must be numeric (got ${parsed.externalPlayerId})`,
            )
        }

        const player = await this.sportsProvider.getPlayerById(playerId)
        if (!player) throw new Error(`Player ${playerId} not found`)
        if (player.teamId === null) {
            throw new Error(`Player ${playerId} is not currently on a team`)
        }

        const now = parsed.contextDate ? new Date(parsed.contextDate) : new Date()
        const recentWindowStart = new Date(
            now.getTime() - RECENT_GAMES_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
        )
        const nextWindowEnd = new Date(
            now.getTime() + NEXT_GAME_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000,
        )

        const [pastSchedule, futureSchedule] = await Promise.all([
            this.sportsProvider.getSchedule({
                startDateUtc: recentWindowStart,
                endDateUtc: now,
                teamId: player.teamId,
            }),
            this.sportsProvider.getSchedule({
                startDateUtc: now,
                endDateUtc: nextWindowEnd,
                teamId: player.teamId,
            }),
        ])

        // Pull box scores for the most recent games, then filter to this
        // player's lines. We over-fetch and trim because the provider's
        // boxscore call is per-game; capping at MAX_RECENT_GAMES bounds cost.
        const finalGames = pastSchedule
            .filter((g) => g.status === 'FINAL')
            .sort(
                (a, b) =>
                    new Date(b.gameDateUtc).getTime() -
                    new Date(a.gameDateUtc).getTime(),
            )
            .slice(0, MAX_RECENT_GAMES)

        const boxScores = await Promise.all(
            finalGames.map((g) => this.sportsProvider.getBoxScore(g.gamePk)),
        )

        const recentGames = finalGames
            .map((game, i) => {
                const box = boxScores[i]
                if (!box) return null
                const batter = box.batters.find(
                    (b) => b.externalPlayerId === playerId,
                )
                const pitcher = box.pitchers.find(
                    (p) => p.externalPlayerId === playerId,
                )
                if (!batter && !pitcher) return null
                return {
                    gamePk: game.gamePk,
                    dateUtc: game.gameDateUtc,
                    opponentTeamId:
                        game.homeTeamId === player.teamId
                            ? game.awayTeamId
                            : game.homeTeamId,
                    wasHome: game.homeTeamId === player.teamId,
                    ...(batter && {
                        hits: batter.hits,
                        homeRuns: batter.homeRuns,
                        rbi: batter.rbi,
                        runs: batter.runs,
                        stolenBases: batter.stolenBases,
                        baseOnBalls: batter.baseOnBalls,
                        strikeOuts: batter.strikeOuts,
                    }),
                    ...(pitcher && {
                        inningsPitched: pitcher.inningsPitched,
                        strikeOutsThrown: pitcher.strikeOuts,
                        earnedRuns: pitcher.earnedRuns,
                        win: pitcher.win,
                    }),
                }
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)

        const nextScheduled = futureSchedule
            .filter((g) => g.status === 'SCHEDULED' || g.status === 'LIVE')
            .sort(
                (a, b) =>
                    new Date(a.gameDateUtc).getTime() -
                    new Date(b.gameDateUtc).getTime(),
            )[0]

        let nextGame = null as {
            gamePk: number
            dateUtc: string
            opponentName: string
            wasHome: boolean
        } | null
        if (nextScheduled) {
            const opponentId =
                nextScheduled.homeTeamId === player.teamId
                    ? nextScheduled.awayTeamId
                    : nextScheduled.homeTeamId
            const opponent = await this.sportsProvider.getTeamById(opponentId)
            nextGame = {
                gamePk: nextScheduled.gamePk,
                dateUtc: nextScheduled.gameDateUtc,
                opponentName: opponent?.name ?? `team ${opponentId}`,
                wasHome: nextScheduled.homeTeamId === player.teamId,
            }
        }

        const { instructions, input: serialized } = buildPlayerAnalysisPrompt({
            nowIso: new Date().toISOString(),
            contextDateIso: now.toISOString(),
            player: {
                externalId: player.id,
                fullName: player.fullName,
                primaryPosition: player.primaryPosition,
                teamName: player.teamName,
                teamAbbreviation: player.teamAbbreviation,
            },
            recentGames,
            nextGame,
        })

        return this.provider.complete({
            tier: 'default',
            instructions,
            input: serialized,
            outputSchema: this.outputSchema,
            schemaName: 'PlayerAnalysisOutput',
        })
    }
}
