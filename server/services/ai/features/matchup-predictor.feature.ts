// matchup_predictor feature module. Light-weight game prediction — cheap
// model tier, low credit cost. Pilots the architecture: every other
// feature follows this exact shape (validate input → fetch context →
// build prompt → call provider → return validated output).
//
// Context fetch uses ISportsProvider directly — there is no CatalogService
// facade in this codebase. The provider has its own cache layer.

import { z } from 'zod'

import type { ISportsProvider } from '../../../providers/sports-provider.interface'

import { AI_FEATURE_KEYS } from '../types'
import type { AIFeatureModule, AIInvocationResult } from '../types'
import type { IOpenAIProvider } from '../provider/openai.provider'
import { buildMatchupPredictorPrompt } from '../prompts/matchup-predictor.prompt'

export const matchupPredictorInputSchema = z.object({
    externalGameId: z.string().min(1),
})
export type MatchupPredictorInput = z.infer<typeof matchupPredictorInputSchema>

export const matchupPredictorOutputSchema = z.object({
    gameId: z.string(),
    homeTeam: z.string(),
    awayTeam: z.string(),
    predictedWinner: z.string(),
    winProbability: z.number().min(0).max(1),
    predictedScore: z.object({
        home: z.number(),
        away: z.number(),
    }),
    keyPlayersToWatch: z
        .array(
            z.object({
                externalPlayerId: z.string(),
                playerName: z.string(),
                reason: z.string(),
            }),
        )
        .min(1),
    confidence: z.enum(['low', 'medium', 'high']),
})
export type MatchupPredictorOutput = z.infer<
    typeof matchupPredictorOutputSchema
>

const SCHEDULE_LOOKAHEAD_DAYS = 5
const SCHEDULE_LOOKBEHIND_DAYS = 2

export class MatchupPredictorFeature
    implements AIFeatureModule<MatchupPredictorInput, MatchupPredictorOutput>
{
    readonly key = AI_FEATURE_KEYS.MATCHUP_PREDICTOR
    readonly inputSchema = matchupPredictorInputSchema
    readonly outputSchema = matchupPredictorOutputSchema

    private readonly provider: IOpenAIProvider
    private readonly sportsProvider: ISportsProvider

    constructor(provider: IOpenAIProvider, sportsProvider: ISportsProvider) {
        this.provider = provider
        this.sportsProvider = sportsProvider
    }

    async invoke(
        _userId: string,
        input: MatchupPredictorInput,
    ): Promise<AIInvocationResult<MatchupPredictorOutput>> {
        const parsed = this.inputSchema.parse(input)
        const gamePk = Number(parsed.externalGameId)
        if (!Number.isFinite(gamePk)) {
            throw new Error(
                `externalGameId must be numeric (got ${parsed.externalGameId})`,
            )
        }

        const context = await this.buildContext(gamePk)

        const { instructions, input: serializedInput } =
            buildMatchupPredictorPrompt(context)

        return this.provider.complete({
            tier: 'cheap',
            instructions,
            input: serializedInput,
            outputSchema: this.outputSchema,
            schemaName: 'MatchupPredictorOutput',
        })
    }

    // Pulls schedule across a tight window so we can locate the game by
    // gamePk and read team ids — there is no direct getGameById in the
    // sports provider surface. After we have the row, we fan out to team
    // and roster lookups in parallel.
    private async buildContext(gamePk: number) {
        const now = new Date()
        const start = new Date(
            now.getTime() - SCHEDULE_LOOKBEHIND_DAYS * 24 * 60 * 60 * 1000,
        )
        const end = new Date(
            now.getTime() + SCHEDULE_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000,
        )
        const schedule = await this.sportsProvider.getSchedule({
            startDateUtc: start,
            endDateUtc: end,
        })
        const game = schedule.find((g) => g.gamePk === gamePk)
        if (!game) {
            throw new Error(`Game ${gamePk} not found in schedule window`)
        }

        const [homeTeam, awayTeam, homeRoster, awayRoster] = await Promise.all([
            this.sportsProvider.getTeamById(game.homeTeamId),
            this.sportsProvider.getTeamById(game.awayTeamId),
            this.sportsProvider.getPlayersByTeam(game.homeTeamId),
            this.sportsProvider.getPlayersByTeam(game.awayTeamId),
        ])

        return {
            nowIso: now.toISOString(),
            gamePk,
            gameDateUtc: game.gameDateUtc,
            gameStatus: game.status,
            homeTeamName: homeTeam?.name ?? `team ${game.homeTeamId}`,
            awayTeamName: awayTeam?.name ?? `team ${game.awayTeamId}`,
            probableHomePitcher: null,
            probableAwayPitcher: null,
            homeRoster: homeRoster.map((p) => ({
                id: p.id,
                name: p.fullName,
                position: p.primaryPosition ?? 'UNK',
            })),
            awayRoster: awayRoster.map((p) => ({
                id: p.id,
                name: p.fullName,
                position: p.primaryPosition ?? 'UNK',
            })),
        }
    }
}
