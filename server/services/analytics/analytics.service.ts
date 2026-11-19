import type {
    CompareResult,
    ExpectedStats,
    FormWindow,
    HittingAnalytics,
    HittingLine,
    PitchingAnalytics,
    PitchingLine,
    PlayerAnalytics,
} from '../../../src/shared/analytics'
import type {
    ExpectedStatsRole,
    ProviderExpectedStats,
} from '../../providers/dto/provider-expected-stats.dto'
import type {
    ProviderPlayerProfile,
    ProviderStatGroup,
} from '../../providers/dto/provider-player-profile.dto'
import type { ISportsProvider } from '../../providers/sports-provider.interface'
import { num } from '../../shared/stat-parse'
import { outlookForPlayer } from '../estimates/player-outlook'

import type { IAnalyticsService } from './analytics.service.interface'
import {
    hittingLineFromGames,
    hittingLineFromSeason,
    pitchingLineFromGames,
    pitchingLineFromSeason,
} from './stat-lines'

const HITTER_FORM_WINDOWS = [7, 14, 30]
const PITCHER_FORM_WINDOWS = [3, 5]

export type ExpectedStatsLoader = (
    season: number,
    role: ExpectedStatsRole,
) => Promise<ProviderExpectedStats[]>

type ExpectedByRole = Partial<Record<ExpectedStatsRole, Map<number, ProviderExpectedStats>>>

export class AnalyticsService implements IAnalyticsService {
    private readonly sportsProvider: ISportsProvider
    private readonly loadExpected: ExpectedStatsLoader

    constructor(sportsProvider: ISportsProvider, loadExpected: ExpectedStatsLoader) {
        this.sportsProvider = sportsProvider
        this.loadExpected = loadExpected
    }

    async getPlayerAnalytics(id: number, season: number): Promise<PlayerAnalytics | null> {
        const profile = await this.sportsProvider.getPlayerProfile(id, season)
        if (!profile) return null

        const expected = await this.loadExpectedFor([profile], season)
        return toAnalytics(profile, expected)
    }

    async comparePlayers(ids: number[], season: number): Promise<CompareResult> {
        const profiles = await Promise.all(ids.map((id) => this.sportsProvider.getPlayerProfile(id, season)))
        const found = profiles.filter((p): p is ProviderPlayerProfile => p !== null)

        const expected = await this.loadExpectedFor(found, season)
        return {
            players: found.map((profile) => toAnalytics(profile, expected)),
            missingIds: ids.filter((_, i) => profiles[i] === null),
        }
    }

    // One Savant leaderboard per role, shared by every player. A Savant outage leaves expected stats empty.
    private async loadExpectedFor(profiles: ProviderPlayerProfile[], season: number): Promise<ExpectedByRole> {
        const roles = [...new Set(profiles.map(roleOf))]
        const loaded = await Promise.all(
            roles.map(async (role) => {
                try {
                    const rows = await this.loadExpected(season, role)
                    return [role, new Map(rows.map((row) => [row.externalPlayerId, row]))] as const
                } catch {
                    return [role, new Map<number, ProviderExpectedStats>()] as const
                }
            }),
        )
        return Object.fromEntries(loaded)
    }
}

const roleOf = (profile: ProviderPlayerProfile): ExpectedStatsRole => {
    const position = profile.player.primaryPosition
    const pitcherOnly = position === 'SP' || position === 'RP' || (!profile.hitting && profile.pitching)
    return pitcherOnly ? 'pitcher' : 'batter'
}

function toAnalytics(profile: ProviderPlayerProfile, expectedByRole: ExpectedByRole): PlayerAnalytics {
    const row = expectedByRole[roleOf(profile)]?.get(profile.player.id) ?? null
    const player = profile.player

    return {
        player: {
            id: player.id,
            fullName: player.fullName,
            position: player.primaryPosition,
            teamName: player.teamName,
            teamAbbreviation: player.teamAbbreviation,
            bats: player.bats,
            throws: player.throws,
            age: player.age,
            photoUrl: player.photoUrl,
        },
        status: profile.status,
        hitting: profile.hitting ? hittingAnalytics(profile.hitting) : null,
        pitching: profile.pitching ? pitchingAnalytics(profile.pitching) : null,
        expected: row ? toExpected(row) : null,
        outlook: outlookForPlayer({ profile, expected: row, opposingStarterThrows: null }),
    }
}

const toExpected = (row: ProviderExpectedStats): ExpectedStats => ({
    xba: row.xba,
    xslg: row.xslg,
    xwoba: row.xwoba,
    barrelRate: row.barrelRate,
    hardHitRate: row.hardHitRate,
    sprintSpeed: row.sprintSpeed,
})

// The newest `count` games, oldest first.
function lastGames(group: ProviderStatGroup, count: number) {
    return [...group.gameLog].sort((a, b) => a.date.localeCompare(b.date)).slice(-count).map((g) => g.stats)
}

function formWindows<Line>(
    group: ProviderStatGroup,
    sizes: number[],
    build: (lines: ReturnType<typeof lastGames>) => Line,
): FormWindow<Line>[] {
    if (group.gameLog.length === 0) return []
    return sizes.map((size) => {
        const lines = lastGames(group, size)
        return { games: lines.length, line: build(lines) }
    })
}

function hittingAnalytics(group: ProviderStatGroup): HittingAnalytics {
    return {
        season: group.season ? hittingLineFromSeason(group.season) : null,
        form: formWindows<HittingLine>(group, HITTER_FORM_WINDOWS, hittingLineFromGames),
        splits: group.splits.map((s) => ({ key: s.key, line: hittingLineFromSeason(s.stats) })),
        woba: num(group.sabermetrics?.woba),
        wrcPlus: num(group.sabermetrics?.wRcPlus),
        war: num(group.sabermetrics?.war),
    }
}

function pitchingAnalytics(group: ProviderStatGroup): PitchingAnalytics {
    return {
        season: group.season ? pitchingLineFromSeason(group.season) : null,
        form: formWindows<PitchingLine>(group, PITCHER_FORM_WINDOWS, pitchingLineFromGames),
        splits: group.splits.map((s) => ({ key: s.key, line: pitchingLineFromSeason(s.stats) })),
        fip: num(group.sabermetrics?.fip),
        war: num(group.sabermetrics?.war),
    }
}
