import type { SupportedBaseballLeague } from '@/shared/baseball'
import type { Position } from '@/shared/sports'

// Domain model for a real player coming from the sports provider. Deliberately
// carries only what the MLB Stats API actually returns — projections, salaries,
// ownership, injury and transfer history are not part of this feed.
export interface PlayerModel {
    id: number
    fullName: string
    firstName: string
    lastName: string
    position: Position
    teamId: number | null
    teamName: string | null
    teamAbbreviation: string | null
    leagueSlug: SupportedBaseballLeague
    age: number | null
    bats: 'L' | 'R' | 'S' | null
    throws: 'L' | 'R' | null
    jerseyNumber: string | null
    photoUrl: string | null
    active: boolean
}

export interface PlayersPage {
    league: SupportedBaseballLeague
    items: PlayerModel[]
    total: number
}
