import type { LeagueStatus } from '../../../src/generated/prisma/enums'

// Tournament-shaped slice of League — Agent 2 owns list endpoints and may
// extend this record with additional fields. Keep this interface narrow
// to the columns the join + progress flows actually need.
export interface LeagueRecord {
    id: string
    name: string
    leagueSlug: string
    externalSeasonId: number
    status: LeagueStatus
    startsAt: Date
    endsAt: Date
    totalWeeks: number
    entryFeeCredits: number
    prizePoolCredits: number
    visibility: 'PUBLIC' | 'PRIVATE'
}

export interface ILeagueRepository {
    findById(id: string): Promise<LeagueRecord | null>
    findManyByIds(ids: string[]): Promise<LeagueRecord[]>
}
