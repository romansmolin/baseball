import { GAME_LEAGUES } from '../../../src/shared/games'
import type { GameLeague } from '../../../src/shared/games'
import type { PerformerDetail, TopPerformer, WeeklyTopPerformers } from '../../../src/shared/performers'
import type { PerformerGroup, ProviderPerformerLine } from '../../providers/dto/provider-performer.dto'
import type { ISportsProvider } from '../../providers/sports-provider.interface'

import { hittingPoints, hittingStats, pitchingPoints, pitchingStats } from './fantasy-points'
import { buildPerformerDetail } from './performer-detail'
import type { IPerformersService } from './performers.service.interface'

const WINDOW_DAYS = 7
const MS_PER_DAY = 24 * 60 * 60 * 1000
// The provider orders by volume (total bases / strikeouts), so the points leaders are almost
// always inside this pool. shortcut: a rare high-points, low-volume player can be missed; raise if so.
const POOL_SIZE = 60

const SCORING = {
    hitting: { points: hittingPoints, stats: hittingStats },
    pitching: { points: pitchingPoints, stats: pitchingStats },
} as const

type LeagueLine = ProviderPerformerLine & { league: GameLeague }

const dateOnly = (date: Date) => date.toISOString().slice(0, 10)

export class PerformersService implements IPerformersService {
    private readonly provider: ISportsProvider

    constructor(provider: ISportsProvider) {
        this.provider = provider
    }

    async getWeeklyTopPerformers(limit: number): Promise<WeeklyTopPerformers> {
        const [hitters, pitchers] = await Promise.all([
            this.leaders('hitting', limit),
            this.leaders('pitching', limit),
        ])
        return { hitters, pitchers }
    }

    async getPerformerDetail(
        playerId: number,
        league: GameLeague,
        group: PerformerGroup,
    ): Promise<PerformerDetail | null> {
        const [player, log] = await Promise.all([
            this.provider.getPlayerById(playerId),
            this.provider.getPerformerLog({ playerId, league, group }),
        ])
        if (!player) return null

        return buildPerformerDetail({
            player: {
                id: player.id,
                fullName: player.fullName,
                primaryPosition: player.primaryPosition,
                teamName: player.teamName,
            },
            league,
            group,
            log,
            windowStart: dateOnly(new Date(Date.now() - WINDOW_DAYS * MS_PER_DAY)),
        })
    }

    // One failing league must not blank the block; only a total failure is an error.
    private async leaders(group: PerformerGroup, limit: number): Promise<TopPerformer[]> {
        const now = new Date()
        const range = { startDateUtc: new Date(now.getTime() - WINDOW_DAYS * MS_PER_DAY), endDateUtc: now }

        const results = await Promise.allSettled(
            GAME_LEAGUES.map((league) => this.provider.getPerformers({ ...range, league, group, limit: POOL_SIZE })),
        )
        const failed = results.filter((r) => r.status === 'rejected')
        if (failed.length === results.length) throw failed[0].reason

        const lines = results.flatMap((r, i) =>
            r.status === 'fulfilled' ? r.value.map((line) => ({ ...line, league: GAME_LEAGUES[i] })) : [],
        )
        return rank(lines, group, limit)
    }
}

export function rank(lines: LeagueLine[], group: PerformerGroup, limit: number): TopPerformer[] {
    const { points, stats } = SCORING[group]
    return lines
        .map((line) => ({
            playerId: line.playerId,
            name: line.fullName,
            teamName: line.teamName,
            position: line.position,
            league: line.league,
            points: Math.round(points(line.stat) * 10) / 10,
            stats: stats(line.stat),
        }))
        .sort((a, b) => b.points - a.points)
        .slice(0, limit)
}
