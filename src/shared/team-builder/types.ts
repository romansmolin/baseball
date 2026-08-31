export type PoolPosition = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'OF'
export type PoolPositionFilter = 'all' | PoolPosition
export type SlotKey = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF'

export interface FieldSlot {
    key: SlotKey
    label: SlotKey
    accept: PoolPosition
    x: number
    y: number
}

export interface PoolPlayer {
    id: number
    name: string
    pos: PoolPosition
    team: string
    leagueSlug: string
    leagueColor: string
    salary: number
    proj: number
    photoUrl: string | null
}

export type Roster = Record<SlotKey, number | null>

export const SALARY_CAP_DEFAULT = 80000
export const ROSTER_SIZE = 9
export const CAPTAIN_MULTIPLIER = 1.5

export const FIELD_SLOTS: FieldSlot[] = [
    { key: 'CF', label: 'CF', accept: 'OF', x: 50, y: 13 },
    { key: 'LF', label: 'LF', accept: 'OF', x: 21, y: 24 },
    { key: 'RF', label: 'RF', accept: 'OF', x: 79, y: 24 },
    { key: 'SS', label: 'SS', accept: 'SS', x: 37, y: 46 },
    { key: '2B', label: '2B', accept: '2B', x: 63, y: 46 },
    { key: '3B', label: '3B', accept: '3B', x: 20, y: 61 },
    { key: '1B', label: '1B', accept: '1B', x: 80, y: 61 },
    { key: 'P', label: 'P', accept: 'P', x: 50, y: 65 },
    { key: 'C', label: 'C', accept: 'C', x: 50, y: 86 },
]

export interface BuilderLeague {
    slug: string
    name: string
    shortName: string
    region: 'north-america' | 'japan-korea' | 'latin-america'
    dotColor: string
    // Whether a real data provider stands behind this league. `false` leagues
    // still list in pickers but are shown as "coming soon" and can't be picked.
    providerBacked: boolean
}

export interface BuilderTeam {
    id: number
    name: string
    abbreviation: string
    locationName: string | null
    league: string | null
    division: string | null
}

export interface BuilderBudget {
    salaryCap: number
}

export interface BuilderRosterSlotPayload {
    externalPlayerId: number
    slotKey: SlotKey
    position: PoolPosition
    name: string
    teamName: string
    salaryAtLock: number
    photoUrl?: string | null
}

export interface CreateTeamPayload {
    name: string
    leagueSlug: string
    format?: 'Daily' | 'Weekly' | 'Tournament'
    captainExternalPlayerId?: number
    players: BuilderRosterSlotPayload[]
}

export interface CreateTeamResult {
    id: string
    name: string
    leagueSlug: string
}

export interface UpdateLineupPayload {
    players: BuilderRosterSlotPayload[]
    captainExternalPlayerId?: number
}
