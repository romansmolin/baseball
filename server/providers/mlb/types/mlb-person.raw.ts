export interface MlbRawPersonPosition {
    code?: string
    name?: string
    type?: string
    abbreviation?: string
}

export interface MlbRawPerson {
    id: number
    fullName: string
    firstName?: string
    lastName?: string
    birthDate?: string
    currentAge?: number
    primaryNumber?: string
    primaryPosition?: MlbRawPersonPosition
    batSide?: { code?: string; description?: string }
    pitchHand?: { code?: string; description?: string }
    currentTeam?: { id?: number; name?: string }
    active?: boolean
    stats?: MlbRawPersonStats[]
    rosterEntries?: MlbRawRosterEntryStatus[]
}

export interface MlbRawRosterEntryStatus {
    status?: { code?: string; description?: string }
    statusDate?: string
}

export interface MlbRawStatSplit {
    stat?: Record<string, string | number>
    // Present on `statSplits` rows: h / a / vl / vr.
    split?: { code?: string }
    // Present on `gameLog` rows.
    date?: string
    opponent?: { id?: number }
}

export interface MlbRawPersonStats {
    type?: { displayName?: string }
    group?: { displayName?: string }
    splits?: MlbRawStatSplit[]
}

export interface MlbRawPeopleResponse {
    people: MlbRawPerson[]
}
