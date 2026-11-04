import type { StandingGroup } from '@/shared/stats'

export interface RawStandingsResponse {
    records?: {
        league?: { id: number; name: string }
        division?: { id: number; name: string }
        teamRecords?: {
            team: { id: number; name: string }
            wins: number
            losses: number
            winningPercentage?: string
            gamesBack?: string
            runDifferential?: number
            streak?: { streakCode?: string }
        }[]
    }[]
}

/** One group per league and division, teams in the order the API ranks them. */
export function mapStandingsToGroups(raw: RawStandingsResponse, leagueLabel: (apiName: string) => string): StandingGroup[] {
    return (raw.records ?? [])
        .filter((record) => record.teamRecords?.length)
        .map((record) => {
            const league = record.league ? leagueLabel(record.league.name) : 'League'
            return {
                id: `${record.league?.id ?? 0}-${record.division?.id ?? 0}`,
                name: record.division ? `${league} · ${record.division.name}` : league,
                rows: record.teamRecords!.map((team) => ({
                    teamId: team.team.id,
                    name: team.team.name,
                    wins: team.wins,
                    losses: team.losses,
                    pct: team.winningPercentage ?? '-',
                    gamesBack: team.gamesBack ?? '-',
                    runDifferential: team.runDifferential ?? 0,
                    streak: team.streak?.streakCode ?? null,
                })),
            }
        })
}
