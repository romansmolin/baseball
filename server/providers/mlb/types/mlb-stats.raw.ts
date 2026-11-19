export interface MlbRawStatsSplit {
    stat: Record<string, string | number>
    team?: { id: number; name: string }
    player?: { id: number; fullName: string }
    position?: { abbreviation?: string }
}

export interface MlbRawStatsResponse {
    stats: Array<{ splits?: MlbRawStatsSplit[] }>
}

export interface MlbRawPlayerStatsResponse {
    stats?: Array<{
        type?: { displayName?: string }
        splits?: Array<{
            date?: string
            opponent?: { name?: string }
            stat: Record<string, string | number>
        }>
    }>
}
