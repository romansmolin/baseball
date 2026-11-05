export type ContestCatalogView = 'current' | 'history'
/** Narrows the current view: contests taking entries, or those already being played. */
export type ContestCatalogPhase = 'open' | 'live'
export type ContestCatalogKind = 'DAILY' | 'SERIES' | 'LEAGUE'
export type ContestCatalogStatus = 'OPEN' | 'LOCKED' | 'DRAFTING' | 'IN_SEASON' | 'PLAYOFFS' | 'COMPLETED' | 'ARCHIVED' | 'CANCELLED'

export interface ContestCatalogItem {
    id: string
    kind: ContestCatalogKind
    name: string
    leagueSlug: string
    status: ContestCatalogStatus
    startsAt: string
    endsAt: string
    locksAt: string | null
    memberCount: number
    entryFeeCredits: number
    prizePoolCredits: number
    templateKey?: string
    slateKey?: string
    /** Distinct real source leagues saved with the games in this contest. */
    sourceLeagues?: string[]
}

export interface ContestCatalogPage {
    items: ContestCatalogItem[]
    total: number
    limit: number
    offset: number
}
