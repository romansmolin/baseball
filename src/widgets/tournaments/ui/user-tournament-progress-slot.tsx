'use client'

import { UserTournamentProgress } from '@/widgets/tournament-progress'

interface UserTournamentProgressSlotProps {
    tournamentId: string
}

// Integration seam with Agent 1's `@/widgets/tournament-progress`. The widget
// internally fetches user progress and self-renders nothing when the user has
// not joined the tournament — Agent 2 does NOT pass per-user state from
// the catalog hooks.
export const UserTournamentProgressSlot = ({
    tournamentId,
}: UserTournamentProgressSlotProps) => (
    <UserTournamentProgress tournamentId={tournamentId} />
)
