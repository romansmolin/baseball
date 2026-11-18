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
    shortName?: string
    region: Region
    dotColor: string
    providerBacked?: boolean
}

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
    name: string
    leagueSlug: string
    players: number
    proj: number
    captain: boolean
    fav: boolean
    savedDaysAgo: number
    rosterSlots: TeamRosterSlot[]
}

export interface MyTeamsPayload {
    teams: Team[]
    leagues: League[]
}
