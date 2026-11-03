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

/** Index 0 is Sunday, matching Date#getUTCDay. */
const weekdayThemes: readonly (readonly string[])[] = [
    ['Sunday Slugfest', 'Sunday Doubleheader', 'Bleacher Bash Sunday', 'Sunday Showdown', 'Series Finale Sunday'],
    ['Monday Diamond', 'Leadoff Monday', 'Monday Mound Duel', 'Monday Batting Practice', 'Fresh Start Monday'],
    ['Tuesday Rally', 'Two-Out Tuesday', 'Tuesday Twin Bill', 'Tuesday Bullpen Battle', 'Triple Play Tuesday'],
    ['Wednesday Dugout', 'Walk-Off Wednesday', 'Midweek Heater', 'Hot Corner Wednesday', 'Warning Track Wednesday'],
    ['Thursday Sluggers', 'Thursday Gap Shot', 'Thursday Day Game Special', 'Pinch Hitter Thursday', 'Thursday Throwdown'],
    ['Friday Ballpark', 'Friday Night Fastballs', 'Fireworks Friday', 'Stolen Base Friday', 'Seventh Inning Friday'],
    ['Saturday Home Run', 'Grand Slam Saturday', 'Cycle Chase Saturday', 'Saturday Bleachers', 'Backyard Brawl Saturday'],
]

const weekendThemes = [
    'Pennant Weekend', 'Rivalry Weekend', 'Extra-Innings Weekend', 'Clubhouse Weekend',
    'Cooperstown Weekend', 'Bases Loaded Weekend', 'Walk-Off Weekend', 'Full Count Weekend',
]

/** Deterministic pick, so the same date always gets the same name. */
function pick<T>(items: readonly T[], seed: string): T {
    let hash = 2166136261
    for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
    return items[(hash >>> 0) % items.length]
}

export function dailyContestName(leagueSlug: string, contestDate: string, slateKey = 'classic'): string {
    const date = new Date(`${contestDate}T12:00:00Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(contestDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== contestDate) {
        throw new Error('Invalid contest date')
    }
    const label = new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    }).format(date)
    const league = leagueNames[leagueSlug] ?? leagueSlug.toUpperCase()

    if (slateKey === 'weekend') {
        const theme = pick(weekendThemes, `weekend:${contestDate}`)
        return leagueSlug === 'north-america' ? `Weekend Series · ${theme} · ${label}` : `Weekend Series · ${league} · ${theme} · ${label}`
    }

    const theme = pick(weekdayThemes[date.getUTCDay()], contestDate)
    return leagueSlug === 'north-america' ? `${theme} · ${label}` : `${league} · ${theme} · ${label}`
}

export function isGenericDailyContestName(leagueSlug: string, name: string): boolean {
    return originalNames[leagueSlug] !== undefined && originalNames[leagueSlug] === name
}

const GENERIC_SHOWCASE_NAME = /^MLB(?: \d{4})? (?:Replay|Season|Daily) Classic$/

/** The themed name a showcase contest still carrying a one-size-fits-all name should have. */
export function themedNameForGenericContest(name: string, contestDate: string): string | null {
    return GENERIC_SHOWCASE_NAME.test(name) ? dailyContestName('mlb', contestDate) : null
}
