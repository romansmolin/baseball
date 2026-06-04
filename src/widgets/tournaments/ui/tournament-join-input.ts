// Re-export the canonical TournamentJoinInput shape from the join feature so
// our slot prop type stays in lock-step with what the join button accepts.
// Kept in a separate file to avoid a circular import between the detail panel
// and the join-button slot.
export type { TournamentJoinInput } from '@/features/tournament-join'
