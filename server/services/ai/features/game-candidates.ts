// Players worth advising on for one game: the busiest hitters of each team plus both probable
// starters, each with a deterministic outlook score. Used by the game_analysis feature.

import type { GameDetail } from '../../../../src/shared/analytics'
import type { ExpectedStatsRole, ProviderExpectedStats } from '../../../providers/dto/provider-expected-stats.dto'
import type { ProviderPlayer } from '../../../providers/dto/provider-player.dto'
import type { ISportsProvider } from '../../../providers/sports-provider.interface'
import { env } from '../../../lib/env'
import { num } from '../../../shared/stat-parse'
import { outlookForPlayer } from '../../estimates/player-outlook'
import type { PlayerOutlook } from '../../../../src/shared/estimates'

export interface GameCandidate {
    externalPlayerId: number
    name: string
    side: 'home' | 'away'
    position: string
    available: boolean
    outlook: PlayerOutlook
}

const HITTERS_PER_TEAM = 10

export type ExpectedStatsLoader = (season: number, role: ExpectedStatsRole) => Promise<ProviderExpectedStats[]>

const isPitcher = (player: ProviderPlayer) => player.primaryPosition === 'SP' || player.primaryPosition === 'RP'

export async function buildGameCandidates(
    sportsProvider: ISportsProvider,
    loadExpected: ExpectedStatsLoader,
    detail: GameDetail,
): Promise<GameCandidate[]> {
    const season = env.defaultSeason()
    const sides = [
        { side: 'home' as const, teamId: detail.game.homeTeam.id, opposing: detail.probablePitchers.away },
        { side: 'away' as const, teamId: detail.game.awayTeam.id, opposing: detail.probablePitchers.home },
    ]

    const rosters = await Promise.all(
        sides.map((s) => sportsProvider.getPlayersByTeam(s.teamId, { statsSeason: season })),
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
        Promise.all([...wanted.keys()].map((id) => sportsProvider.getPlayerProfile(id, season))),
        expectedById(loadExpected, season, 'batter'),
        expectedById(loadExpected, season, 'pitcher'),
    ])

    const candidates: GameCandidate[] = []
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

async function expectedById(
    loadExpected: ExpectedStatsLoader,
    season: number,
    role: ExpectedStatsRole,
): Promise<Map<number, ProviderExpectedStats>> {
    try {
        return new Map((await loadExpected(season, role)).map((row) => [row.externalPlayerId, row]))
    } catch {
        return new Map()
    }
}
