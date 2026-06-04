import { POSITION_GROUP, type Position, type PositionGroup } from '@/shared/sports'

export type { Position, PositionGroup }
export { POSITION_GROUP }

export interface League {
    slug: string
    name: string
    color: string
}

export type AvailabilityStatus = 'active' | 'probable' | 'injured' | 'out'

export interface AvailabilityMeta {
    label: string
    dot: string
    textClass: string
    bgClass: string
}

export const AVAILABILITY: Record<AvailabilityStatus, AvailabilityMeta> = {
    active: {
        label: 'Active',
        dot: '#22c55e',
        textClass: 'text-[#16a34a]',
        bgClass: 'bg-[#22c55e]/10',
    },
    probable: {
        label: 'Probable',
        dot: '#f59e0b',
        textClass: 'text-[#d97706]',
        bgClass: 'bg-[#f59e0b]/12',
    },
    injured: {
        label: 'Day-to-day',
        dot: '#f97316',
        textClass: 'text-[#ea580c]',
        bgClass: 'bg-[#f97316]/12',
    },
    out: {
        label: 'Out (IL)',
        dot: '#ef4444',
        textClass: 'text-[#dc2626]',
        bgClass: 'bg-[#ef4444]/12',
    },
}

export const AVAILABILITY_ORDER: AvailabilityStatus[] = ['active', 'probable', 'injured', 'out']

export interface BattingStats {
    AVG: string
    HR: number
    RBI: number
    OBP: string
    SLG: string
    SB: number
    R: number
    H: number
}

export interface PitchingStats {
    ERA: string
    W: number
    SO: number
    WHIP: string
    IP: string
    SV: number
}

export interface InjuryRecord {
    date: string
    type: string
    status: 'On IL' | 'Probable' | 'Day-to-day' | 'Resolved' | 'Recovered'
    note: string
}

export interface TransferRecord {
    date: string
    from: string
    to: string
    type: string
}

export interface Player {
    id: number
    name: string
    pos: Position
    team: string
    leagueSlug: string
    status: AvailabilityStatus
    age: number
    bats: 'L' | 'R' | 'S'
    proj: number
    avg: number
    salary: number
    own: number
    form: number[]
    bat?: BattingStats
    pitch?: PitchingStats
    injuries: InjuryRecord[]
    transfers: TransferRecord[]
    metrics: Record<string, string>
}

export type LeagueFilter = 'all' | string
export type StatusFilter = 'all' | AvailabilityStatus
export type PositionFilter = 'all' | PositionGroup
export type SortKey = 'proj' | 'avg' | 'own' | 'salary' | 'name'
export type DrawerTab = 'stats' | 'injuries' | 'transfers' | 'metrics'

export const isPitcher = (player: Player): boolean =>
    POSITION_GROUP[player.pos] === 'P'
