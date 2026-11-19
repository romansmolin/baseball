export interface MlbRawTeamRecord {
    team: { id: number }
    wins: number
    losses: number
    records?: { splitRecords?: Array<{ type: string; wins: number; losses: number }> }
}

export interface MlbRawStandingsResponse {
    records: Array<{ teamRecords: MlbRawTeamRecord[] }>
}
