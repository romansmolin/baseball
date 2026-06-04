// Half-open UTC week interval for tournament scoring. Week 1 begins exactly
// at `startsAt`; each subsequent week is shifted by 7 * 24h. No timezone math —
// we operate purely on UTC milliseconds to avoid DST-shift surprises.

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_WEEK = 7 * MS_PER_DAY

export interface TournamentWeekRange {
    startUtc: Date
    endUtc: Date
}

export function tournamentWeekRange(startsAt: Date, week: number): TournamentWeekRange {
    if (week < 1) {
        throw new Error(`tournamentWeekRange: week must be >= 1, received ${week}`)
    }

    const baseMs = startsAt.getTime()
    const startUtc = new Date(baseMs + (week - 1) * MS_PER_WEEK)
    const endUtc = new Date(baseMs + week * MS_PER_WEEK)

    return { startUtc, endUtc }
}
