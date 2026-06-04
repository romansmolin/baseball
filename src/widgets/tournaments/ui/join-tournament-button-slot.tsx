'use client'

import { JoinTournamentButton } from '@/features/tournament-join'

import type { TournamentJoinInput } from './tournament-join-input'

interface JoinTournamentButtonSlotProps {
    tournament: TournamentJoinInput
}

// Integration seam with Agent 1's `@/features/tournament-join`.
// Kept as a thin pass-through so the panel doesn't directly know about the
// join feature's internals — easy to swap or wrap in a feature flag later.
export const JoinTournamentButtonSlot = ({
    tournament,
}: JoinTournamentButtonSlotProps) => (
    <JoinTournamentButton tournament={tournament} fullWidth />
)
