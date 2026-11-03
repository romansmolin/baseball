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
}

export interface MlbRawPersonStats {
    group?: { displayName?: string }
    splits?: Array<{ stat?: Record<string, string | number> }>
}

export interface MlbRawPeopleResponse {
    people: MlbRawPerson[]
}
