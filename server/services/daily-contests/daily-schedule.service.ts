import { WINTER_LEAGUE_SOURCES, type BaseballProviderLeague } from '@/shared/baseball'
import type { ISportsProvider } from '../../providers/sports-provider.interface'
import type { ProviderScheduledGame } from '../../providers/dto/provider-schedule.dto'
import {
    CONTEST_GAME_TYPES,
    MINOR_CONTEST_LEAGUES,
    MINOR_CONTEST_SOURCE,
    NORTH_AMERICA_CONTEST_LEAGUES,
    NORTH_AMERICA_CONTEST_SOURCE,
} from '../../providers/contest-source-registry'

export interface DailyScheduledGame {
    game: ProviderScheduledGame
    apiSeason: number
    /** Absent on legacy, single-league records created before source provenance. */
    sourceLeagueSlug?: BaseballProviderLeague
}

export async function loadDailySchedule(
    provider: ISportsProvider,
    input: { league: BaseballProviderLeague; startDateUtc: Date; endDateUtc: Date; revalidateSeconds?: number },
): Promise<DailyScheduledGame[]> {
    const startYear = input.startDateUtc.getUTCFullYear()
    const endYear = input.endDateUtc.getUTCFullYear()
    const calendarYears = Array.from(new Set([startYear, endYear]))
    const seasons = input.league === 'winter-leagues'
        ? [...new Set(calendarYears.flatMap(year => [year, year - 1]))].sort((a, b) => b - a)
        : [startYear]
    const gamesById = new Map<number, DailyScheduledGame>()

    for (const apiSeason of seasons) {
        const games = await provider.getSchedule({ ...input, season: apiSeason })
        for (const game of games) {
            if (!gamesById.has(game.gamePk)) gamesById.set(game.gamePk, { game, apiSeason, sourceLeagueSlug: input.league })
        }
    }

    return [...gamesById.values()]
}

/** Load one cross-level pool from the MLB Stats API's globally scoped MLBAM IDs. */
export async function loadNorthAmericanContestSchedule(
    provider: ISportsProvider,
    input: { startDateUtc: Date; endDateUtc: Date; revalidateSeconds?: number },
    leagues: readonly BaseballProviderLeague[] = NORTH_AMERICA_CONTEST_LEAGUES,
): Promise<DailyScheduledGame[]> {
    const years = [...new Set([input.startDateUtc.getUTCFullYear(), input.endDateUtc.getUTCFullYear()])]
    const settled = await Promise.allSettled(leagues.flatMap(league =>
        years.map(async season => {
            const games = await provider.getSchedule({ ...input, league, season, gameTypes: CONTEST_GAME_TYPES })
            return games.map(game => ({ game, apiSeason: season, sourceLeagueSlug: league }))
        }),
    ))
    const rows = settled.flatMap(result => result.status === 'fulfilled' ? result.value : [])
    const failed = settled.filter(result => result.status === 'rejected')
    if (!rows.length && failed.length === settled.length) {
        throw new AggregateError(failed.map(result => result.status === 'rejected' ? result.reason : undefined), 'All eligible league schedules are unavailable')
    }

    // The MLB Stats API assigns MLBAM gamePk values across the supported
    // levels. Keep the first row deterministically if an upstream schedule
    // happens to repeat an ID across adjacent season queries.
    const byGamePk = new Map<number, DailyScheduledGame>()
    for (const row of rows.sort((a, b) => a.game.gamePk - b.game.gamePk || a.sourceLeagueSlug!.localeCompare(b.sourceLeagueSlug!))) {
        if (!byGamePk.has(row.game.gamePk)) byGamePk.set(row.game.gamePk, row)
    }
    return [...byGamePk.values()]
}

/** Load the schedule a published contest was built from, whichever source it belongs to. */
export function loadContestSourceSchedule(
    provider: ISportsProvider,
    sourceSlug: string,
    input: { startDateUtc: Date; endDateUtc: Date; revalidateSeconds?: number },
): Promise<DailyScheduledGame[]> {
    if (sourceSlug === NORTH_AMERICA_CONTEST_SOURCE) return loadNorthAmericanContestSchedule(provider, input)
    if (sourceSlug === MINOR_CONTEST_SOURCE) return loadNorthAmericanContestSchedule(provider, input, MINOR_CONTEST_LEAGUES)
    // Each winter league is a slice of the one Winter Leagues feed.
    const league = WINTER_LEAGUE_SOURCES.some((winter) => winter.slug === sourceSlug) ? 'winter-leagues' : (sourceSlug as BaseballProviderLeague)
    return loadDailySchedule(provider, { ...input, league })
}
