import type { TournamentStatus } from '@/shared/tournaments'

// Subset of TournamentRecord the join feature needs. Accepts any object
// matching this shape so the feature works regardless of catalog evolution.
export interface TournamentJoinInput {
    id: string
    name: string
    leagueSlug: string
    entryFeeCredits: number
    prizePoolCredits: number
    status: TournamentStatus
    startsAt: string
}
