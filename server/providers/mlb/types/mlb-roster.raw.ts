import type { MlbRawPersonPosition } from './mlb-person.raw'

export interface MlbRawRosterEntry {
    person: { id: number; fullName: string }
    jerseyNumber?: string
    position: MlbRawPersonPosition
    status?: { code?: string; description?: string }
}

export interface MlbRawRosterResponse {
    roster: MlbRawRosterEntry[]
    teamId?: number
    rosterType?: string
}
