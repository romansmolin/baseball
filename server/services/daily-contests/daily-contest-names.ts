const leagueNames: Record<string, string> = {
    mlb: 'MLB',
    'triple-a': 'Triple-A',
    'double-a': 'Double-A',
    'winter-leagues': 'Winter Leagues',
    'north-america': 'North American Leagues',
}

const originalNames: Record<string, string> = {
    mlb: 'MLB Daily Classic',
    'triple-a': 'TRIPLE-A Daily Classic',
    'double-a': 'DOUBLE-A Daily Classic',
    'winter-leagues': 'Winter Leagues Daily Classic',
}

const themes = [
    'Sunday Slugfest', 'Monday Diamond', 'Tuesday Rally', 'Wednesday Dugout',
    'Thursday Sluggers', 'Friday Ballpark', 'Saturday Home Run',
]

export function dailyContestName(leagueSlug: string, contestDate: string, slateKey = 'classic'): string {
    const date = new Date(`${contestDate}T12:00:00Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(contestDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== contestDate) {
        throw new Error('Invalid contest date')
    }
    const label = new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    }).format(date)
    if (slateKey === 'weekend') return `Weekend Series · ${leagueNames[leagueSlug] ?? leagueSlug.toUpperCase()} · ${label}`
    if (leagueSlug === 'north-america') return `Daily Lineup · ${label}`
    return `${leagueNames[leagueSlug] ?? leagueSlug.toUpperCase()} · ${themes[date.getUTCDay()]} · ${label}`
}

export function isGenericDailyContestName(leagueSlug: string, name: string): boolean {
    return originalNames[leagueSlug] !== undefined && originalNames[leagueSlug] === name
}
