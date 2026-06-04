'use client'

import {
    Coins01Icon,
    LockedIcon,
    Login02Icon,
    Tick02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/shared/ui/button'

import type { TournamentJoinInput } from '../model/tournament-input.type'
import { useTournamentJoin } from '../model/use-tournament-join'

import { TournamentJoinDialog } from './tournament-join-dialog'

interface JoinTournamentButtonProps {
    tournament: TournamentJoinInput
    size?: 'default' | 'sm' | 'lg'
    fullWidth?: boolean
}

// Mid-season joining is now allowed: DRAFTING, IN_SEASON and PLAYOFFS are
// joinable. Only COMPLETED / ARCHIVED tournaments are truly closed.
const closedLabel = (status: TournamentJoinInput['status']): string | null => {
    if (status === 'COMPLETED' || status === 'ARCHIVED') return 'Closed'
    return null
}

export const JoinTournamentButton = ({
    tournament,
    size = 'lg',
    fullWidth = false,
}: JoinTournamentButtonProps) => {
    const state = useTournamentJoin({ tournament })
    const closed = closedLabel(tournament.status)

    if (closed) {
        return (
            <Button
                size={size}
                variant="secondary"
                disabled
                className={fullWidth ? 'w-full gap-2' : 'gap-2'}
                title="This tournament has ended"
            >
                <HugeiconsIcon icon={LockedIcon} className="size-4" />
                {closed}
            </Button>
        )
    }

    if (state.isAlreadyJoined) {
        return (
            <Button
                size={size}
                variant="secondary"
                disabled
                className={fullWidth ? 'w-full gap-2' : 'gap-2'}
                title="You're already in this tournament"
            >
                <HugeiconsIcon icon={Tick02Icon} className="size-4" />
                Joined
            </Button>
        )
    }

    return (
        <>
            <Button
                size={size}
                className={fullWidth ? 'w-full gap-2' : 'gap-2'}
                onClick={() => state.open()}
            >
                <HugeiconsIcon icon={Login02Icon} className="size-4" />
                Join tournament
                {tournament.entryFeeCredits > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs opacity-90">
                        · <HugeiconsIcon icon={Coins01Icon} className="size-3" />
                        {tournament.entryFeeCredits}
                    </span>
                ) : null}
            </Button>
            <TournamentJoinDialog tournament={tournament} state={state} />
        </>
    )
}
