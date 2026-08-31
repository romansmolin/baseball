export const MLB_REVALIDATE = {
    teams: 86400,
    team: 86400,
    players: 21600,
    person: 43200,
    roster: 3600,
    schedule: 900,
    boxscore: 300,
} as const

export const MLB_PEOPLE_HYDRATE_CHUNK = 100

// Cache tags. `sportId` is part of the identity for every endpoint whose
// result set depends on the league (teams / players / schedule) so that, say,
// Triple-A players for 2026 can never collide with MLB players for 2026.
// team / roster / person / boxscore are keyed by globally-unique ids and need
// no sportId segment.
export const mlbTags = {
    teams: (sportId: number, season: number) => `mlb:teams:${sportId}:${season}`,
    team: (id: number, season: number) => `mlb:team:${id}:${season}`,
    players: (sportId: number, season: number) => `mlb:players:${sportId}:${season}`,
    person: (id: number) => `mlb:person:${id}`,
    roster: (teamId: number, season: number) => `mlb:roster:${teamId}:${season}`,
    schedule: (sportId: number, startISO: string, endISO: string, teamKey?: string) =>
        `mlb:schedule:${sportId}:${startISO}:${endISO}${teamKey ? `:${teamKey}` : ''}`,
    boxscore: (gamePk: number) => `mlb:box:${gamePk}`,
}
