export const MLB_SPORT_ID = 1

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

export const mlbTags = {
    teams: (season: number) => `mlb:teams:${season}`,
    team: (id: number, season: number) => `mlb:team:${id}:${season}`,
    players: (season: number) => `mlb:players:${season}`,
    person: (id: number) => `mlb:person:${id}`,
    roster: (teamId: number, season: number) => `mlb:roster:${teamId}:${season}`,
    schedule: (startISO: string, endISO: string, teamId?: number) =>
        `mlb:schedule:${startISO}:${endISO}${teamId != null ? `:${teamId}` : ''}`,
    boxscore: (gamePk: number) => `mlb:box:${gamePk}`,
}
