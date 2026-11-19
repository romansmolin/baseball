import type { UpcomingGameRecord } from '@/shared/games'

export interface GameDayGroup {
    // YYYY-MM-DD in the viewer's time zone.
    dateKey: string
    games: UpcomingGameRecord[]
}

const dateKeyFormat = (timeZone?: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })

export function groupGamesByDate(games: UpcomingGameRecord[], timeZone?: string): GameDayGroup[] {
    const format = dateKeyFormat(timeZone)
    const sorted = [...games].sort((a, b) => a.gameDateUtc.localeCompare(b.gameDateUtc))

    const groups = new Map<string, UpcomingGameRecord[]>()
    for (const game of sorted) {
        const key = format.format(new Date(game.gameDateUtc))
        groups.set(key, [...(groups.get(key) ?? []), game])
    }
    return [...groups].map(([dateKey, dayGames]) => ({ dateKey, games: dayGames }))
}

// Whole-percent widths for the two sides of the estimate bar; they always add up to 100.
export function estimateBarWidths(homeWinProbability: number): { home: number; away: number } {
    const home = Math.round(homeWinProbability * 100)
    return { home, away: 100 - home }
}
