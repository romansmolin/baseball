import type { ProviderTeamStanding } from '../../dto/provider-team-standing.dto'
import type { MlbRawStandingsResponse } from '../types/mlb-standings.raw'

export function mapMlbStandingsToProvider(raw: MlbRawStandingsResponse): ProviderTeamStanding[] {
    return raw.records.flatMap((division) =>
        division.teamRecords.map((row) => {
            const lastTen = row.records?.splitRecords?.find((split) => split.type === 'lastTen')
            return {
                teamId: row.team.id,
                wins: row.wins,
                losses: row.losses,
                lastTen: lastTen ? { wins: lastTen.wins, losses: lastTen.losses } : null,
            }
        }),
    )
}
