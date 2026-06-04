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
}

export interface MlbRawPeopleResponse {
    people: MlbRawPerson[]
}
