export type Region = 'north-america' | 'japan-korea' | 'latin-america'

export const REGION_LABEL: Record<Region, string> = {
    'north-america': 'North America',
    'japan-korea': 'Japan & Korea',
    'latin-america': 'Latin America',
}

export const REGION_ORDER: Region[] = ['north-america', 'japan-korea', 'latin-america']

export interface League {
    slug: string
    name: string
    region: Region
    dotColor: string
}

export type TeamStatus = 'active' | 'draft'
export type TeamFormat = 'Daily' | 'Weekly' | 'Tournament'

export interface TeamRosterSlot {
    id: string
    externalPlayerId: number
    playerName: string
    playerPosition: string
    playerTeamName: string
    playerPhotoUrl: string | null
    slotPosition: string
    salaryAtLock: number
    isCaptain: boolean
}

export interface Team {
    id: string
    leagueMemberId: string | null
    name: string
    leagueSlug: string
    format: TeamFormat
    players: number
    proj: number
    best: number
    entered: number
    captain: boolean
    fav: boolean
    savedDaysAgo: number
    status: TeamStatus
    rosterSlots: TeamRosterSlot[]
}

export interface MyTeamsPayload {
    teams: Team[]
    leagues: League[]
}
