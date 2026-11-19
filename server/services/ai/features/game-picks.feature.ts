// game_picks feature. For one upcoming MLB game, recommends which players to
// start, sit or watch in a fantasy team on an outside platform. The estimate and
// every player's outlook are computed here, deterministically; the model only
// explains them and chooses among the candidates it was given.

import { z } from 'zod'

import { SCORING_PRESETS, type ScoringPreset } from '../../../../src/shared/team-builder'
import type { ExpectedStatsRole, ProviderExpectedStats } from '../../../providers/dto/provider-expected-stats.dto'
import type { ProviderPlayer } from '../../../providers/dto/provider-player.dto'
import type { ISportsProvider } from '../../../providers/sports-provider.interface'
import type { IFantasyTeamRepository } from '../../../repositories/fantasy-team/fantasy-team.repository.interface'
import { ApiError } from '../../../errors/api.error'
import { ErrorCode } from '../../../errors/error-code.enum'
import { env } from '../../../lib/env'
import { num } from '../../../shared/stat-parse'
import { outlookForPlayer } from '../../estimates/player-outlook'
import type { IGamesService } from '../../games/games.service.interface'
import { AIProviderError } from '../errors'
import { buildGamePicksPrompt } from '../prompts/game-picks.prompt'
import type { GamePicksCandidate, GamePicksPromptContext } from '../prompts/game-picks.prompt'
import type { IOpenAIProvider } from '../provider/openai.provider'
import { AI_FEATURE_KEYS } from '../types'
import type { AIFeatureModule, AIInvocationResult } from '../types'

export const gamePicksInputSchema = z.object({
    gamePk: z.number().int().positive(),
    // One of the user's saved teams, to tailor the advice to its roster.
    teamId: z.string().min(1).optional(),
    // Left open on purpose: a saved team's preset applies unless one is sent, then POINTS.
    scoringPreset: z.enum(SCORING_PRESETS).optional(),
})
export type GamePicksInput = z.input<typeof gamePicksInputSchema>

export const gamePicksOutputSchema = z.object({
    gamePk: z.number(),
    picks: z
        .array(
            z.object({
                externalPlayerId: z.number(),
                playerName: z.string(),
                role: z.enum(['start', 'sit', 'watch']),
                reason: z.string(),
            }),
        )
        .min(1),
    summary: z.string(),
})
export type GamePicksOutput = z.infer<typeof gamePicksOutputSchema>

const HITTERS_PER_TEAM = 10

export type ExpectedStatsLoader = (season: number, role: ExpectedStatsRole) => Promise<ProviderExpectedStats[]>

const isPitcher = (player: ProviderPlayer) => player.primaryPosition === 'SP' || player.primaryPosition === 'RP'

export class GamePicksFeature implements AIFeatureModule<GamePicksInput, GamePicksOutput> {
    readonly key = AI_FEATURE_KEYS.GAME_PICKS
    readonly inputSchema = gamePicksInputSchema
    readonly outputSchema = gamePicksOutputSchema

    private readonly provider: IOpenAIProvider
    private readonly sportsProvider: ISportsProvider
    private readonly gamesService: IGamesService
    private readonly fantasyTeamRepo: IFantasyTeamRepository
    private readonly loadExpected: ExpectedStatsLoader

    constructor(
        provider: IOpenAIProvider,
        sportsProvider: ISportsProvider,
        gamesService: IGamesService,
        fantasyTeamRepo: IFantasyTeamRepository,
        loadExpected: ExpectedStatsLoader,
    ) {
        this.provider = provider
        this.sportsProvider = sportsProvider
        this.gamesService = gamesService
        this.fantasyTeamRepo = fantasyTeamRepo
        this.loadExpected = loadExpected
    }

    async invoke(userId: string, input: GamePicksInput): Promise<AIInvocationResult<GamePicksOutput>> {
        const parsed = this.inputSchema.parse(input)

        const detail = await this.gamesService.getGameDetail(parsed.gamePk)
        if (!detail) {
            throw ApiError.notFound(ErrorCode.GAME_NOT_FOUND, `Game ${parsed.gamePk} not found`)
        }
        if (detail.game.leagueSlug !== 'mlb') {
            throw ApiError.validationError('Picks are only available for MLB games')
        }
        if (detail.game.status !== 'SCHEDULED') {
            throw ApiError.validationError('Picks are only available for games that have not started')
        }

        const { roster: userRoster, scoringPreset: teamPreset } = await this.loadUserTeam(userId, parsed.teamId)
        const candidates = await this.buildCandidates(detail)

        const { instructions, input: serialized } = buildGamePicksPrompt({
            nowIso: new Date().toISOString(),
            scoringPreset: parsed.scoringPreset ?? teamPreset ?? 'POINTS',
            game: {
                gamePk: detail.game.gamePk,
                home: detail.game.homeTeam.name,
                away: detail.game.awayTeam.name,
                startsAt: detail.game.gameDateUtc,
                venue: detail.game.venueName,
            },
            estimate: detail.estimate,
            weather: detail.weather,
            probablePitchers: detail.probablePitchers,
            userRoster,
            candidates,
        })

        const result = await this.provider.complete({
            tier: 'complex_reasoning',
            instructions,
            input: serialized,
            outputSchema: this.outputSchema,
            schemaName: 'GamePicksOutput',
        })

        const allowed = new Set(candidates.map((c) => c.externalPlayerId))
        const stranger = result.output.picks.find((pick) => !allowed.has(pick.externalPlayerId))
        if (stranger) {
            throw new AIProviderError(`Pick ${stranger.externalPlayerId} is not among the candidates`)
        }
        return result
    }

    private async loadUserTeam(
        userId: string,
        teamId: string | undefined,
    ): Promise<{ roster: GamePicksPromptContext['userRoster']; scoringPreset: ScoringPreset | null }> {
        if (!teamId) return { roster: [], scoringPreset: null }
        const team = await this.fantasyTeamRepo.findById(teamId)
        if (!team) throw ApiError.notFound(ErrorCode.TEAM_NOT_FOUND, `Team ${teamId} not found`)
        if (team.userId !== userId) {
            throw new ApiError(403, ErrorCode.TEAM_NOT_OWNED, `Team ${teamId} is not owned by this user`)
        }
        return {
            scoringPreset: team.scoringPreset ?? null,
            roster: team.rosterSlots.map((slot) => ({
                externalPlayerId: slot.externalPlayerId,
                playerName: slot.playerName,
                slotPosition: String(slot.slotPosition),
                playerPosition: String(slot.playerPosition),
            })),
        }
    }

    private async buildCandidates(
        detail: NonNullable<Awaited<ReturnType<IGamesService['getGameDetail']>>>,
    ): Promise<GamePicksCandidate[]> {
        const season = env.defaultSeason()
        const sides = [
            { side: 'home' as const, teamId: detail.game.homeTeam.id, opposing: detail.probablePitchers.away },
            { side: 'away' as const, teamId: detail.game.awayTeam.id, opposing: detail.probablePitchers.home },
        ]

        // The busiest hitters of each team, plus both probable starters.
        const rosters = await Promise.all(
            sides.map((s) => this.sportsProvider.getPlayersByTeam(s.teamId, { statsSeason: season })),
        )
        const wanted = new Map<number, { side: 'home' | 'away'; opposingThrows: 'L' | 'R' | null }>()
        sides.forEach((s, i) => {
            rosters[i]
                .filter((player) => !isPitcher(player))
                .sort((a, b) => (num(b.battingStats?.plateAppearances) ?? 0) - (num(a.battingStats?.plateAppearances) ?? 0))
                .slice(0, HITTERS_PER_TEAM)
                .forEach((player) => wanted.set(player.id, { side: s.side, opposingThrows: s.opposing?.throws ?? null }))
        })
        const starters = [
            { pitcher: detail.probablePitchers.home, side: 'home' as const },
            { pitcher: detail.probablePitchers.away, side: 'away' as const },
        ]
        for (const { pitcher, side } of starters) {
            if (pitcher) wanted.set(pitcher.id, { side, opposingThrows: null })
        }

        const [profiles, batters, pitchers] = await Promise.all([
            Promise.all([...wanted.keys()].map((id) => this.sportsProvider.getPlayerProfile(id, season))),
            this.expectedById(season, 'batter'),
            this.expectedById(season, 'pitcher'),
        ])

        const candidates: GamePicksCandidate[] = []
        for (const profile of profiles) {
            if (!profile) continue
            const context = wanted.get(profile.player.id)
            if (!context) continue
            const expected = (isPitcher(profile.player) ? pitchers : batters).get(profile.player.id) ?? null
            candidates.push({
                externalPlayerId: profile.player.id,
                name: profile.player.fullName,
                side: context.side,
                position: profile.player.primaryPosition,
                available: profile.status.available,
                outlook: outlookForPlayer({
                    profile,
                    expected,
                    opposingStarterThrows: context.opposingThrows,
                    weather: detail.weather,
                }),
            })
        }
        return candidates
    }

    private async expectedById(season: number, role: ExpectedStatsRole): Promise<Map<number, ProviderExpectedStats>> {
        try {
            return new Map((await this.loadExpected(season, role)).map((row) => [row.externalPlayerId, row]))
        } catch {
            return new Map()
        }
    }
}
