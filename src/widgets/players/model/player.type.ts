import { POSITION_GROUP, type Position, type PositionGroup } from '@/shared/sports'

export type { Position, PositionGroup }
export { POSITION_GROUP }

export interface League {
    slug: string
    name: string
    color: string
}

export type AvailabilityStatus = 'active' | 'out'

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
    out: {
        label: 'Inactive',
        dot: '#ef4444',
        textClass: 'text-[#dc2626]',
        bgClass: 'bg-[#ef4444]/12',
    },
}

export const AVAILABILITY_ORDER: AvailabilityStatus[] = ['active', 'out']

export interface Player {
    id: number
    name: string
    pos: Position
    team: string
    leagueSlug: string
    status: AvailabilityStatus
    age: number | null
    bats: 'L' | 'R' | 'S' | '—'
    throws: 'L' | 'R' | '—'
    jerseyNumber: string | null
    photoUrl: string | null
    statsSeason: number
    battingStats?: Record<string, string | number>
    pitchingStats?: Record<string, string | number>
}

export type LeagueFilter = 'all' | string
export type StatusFilter = 'all' | AvailabilityStatus
export type PositionFilter = 'all' | PositionGroup
export type DrawerTab = 'stats'

export const isPitcher = (player: Player): boolean =>
    POSITION_GROUP[player.pos] === 'P'
