'use client'

import {
    Cancel01Icon,
    Coins01Icon,
    Login02Icon,
    Tick02Icon,
    UserAdd01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'
import { Dialog } from '@base-ui/react/dialog'

import { Button, buttonVariants } from '@/shared/ui/button'
import { cn } from '@/shared/utils'

import type { TournamentJoinInput } from '../model/tournament-input.type'
import type { UseTournamentJoinResult } from '../model/use-tournament-join'

interface TournamentJoinDialogProps {
    tournament: TournamentJoinInput
    state: UseTournamentJoinResult
}

export const TournamentJoinDialog = ({
    tournament,
    state,
}: TournamentJoinDialogProps) => {
    return (
        <Dialog.Root open={state.isOpen} onOpenChange={(open) => (open ? state.open() : state.close())}>
            <Dialog.Portal>
                <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
                <Dialog.Popup
                    className={cn(
                        'fixed top-1/2 left-1/2 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col',
                        'rounded-2xl border border-foreground/10 bg-card shadow-2xl outline-none transition-all',
                        'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
                        'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
                    )}
                >
                    <Header tournament={tournament} onClose={state.close} />
                    <div className="flex flex-col gap-4 px-5 py-4">
                        <DialogBody tournament={tournament} state={state} />
                    </div>
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    )
}

const Header = ({
    tournament,
    onClose,
}: {
    tournament: TournamentJoinInput
    onClose: () => void
}) => (
    <div className="flex items-start justify-between gap-3 border-b border-foreground/10 px-5 py-4">
        <div className="min-w-0">
            <Dialog.Title className="font-medium">Join tournament</Dialog.Title>
            <Dialog.Description className="mt-0.5 truncate text-xs text-muted-foreground">
                {tournament.name}
            </Dialog.Description>
        </div>
        <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
        >
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
        </button>
    </div>
)

const DialogBody = ({
    tournament,
    state,
}: {
    tournament: TournamentJoinInput
    state: UseTournamentJoinResult
}) => {
    if (state.status === 'loading') {
        return <LoadingState />
    }

    if (state.status === 'error') {
        return (
            <ErrorState
                message={state.teamsError ?? 'Failed to load teams.'}
                onRetry={state.retryLoadTeams}
            />
        )
    }

    if (state.status === 'already-joined') {
        return <AlreadyJoinedState onClose={state.close} />
    }

    if (state.status === 'no-teams') {
        return <NoTeamsState />
    }

    if (state.status === 'no-eligible-teams') {
        return <NoEligibleTeamsState leagueName={state.league?.name ?? tournament.leagueSlug} />
    }

    return <ConfirmState tournament={tournament} state={state} />
}

const AlreadyJoinedState = ({ onClose }: { onClose: () => void }) => (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
        <HugeiconsIcon icon={Tick02Icon} className="size-8 text-primary" />
        <div>
            <div className="font-medium">You&apos;re already in this tournament</div>
            <p className="mt-1 text-xs text-muted-foreground">
                Your team is in. Check the standings or your weekly progress in the
                tournament detail panel.
            </p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
            Close
        </Button>
    </div>
)

const LoadingState = () => (
    <div className="py-8 text-center text-sm text-muted-foreground">Loading your teams…</div>
)

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
        <p className="text-sm text-destructive">{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
        </Button>
    </div>
)

const NoTeamsState = () => (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
        <HugeiconsIcon icon={UserAdd01Icon} className="size-8 text-primary" />
        <div>
            <div className="font-medium">You don&apos;t have any teams yet</div>
            <p className="mt-1 text-xs text-muted-foreground">
                Build a lineup first, then come back to join a tournament.
            </p>
        </div>
        <Link href="/teams/new" className={cn(buttonVariants({ variant: 'default' }))}>
            Create a team
        </Link>
    </div>
)

const NoEligibleTeamsState = ({ leagueName }: { leagueName: string }) => (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
        <HugeiconsIcon icon={UserAdd01Icon} className="size-8 text-primary" />
        <div>
            <div className="font-medium">No eligible team for this tournament</div>
            <p className="mt-1 text-xs text-muted-foreground">
                You don&apos;t have an unjoined team in the {leagueName} league.
                Create one to join.
            </p>
        </div>
        <Link href="/teams/new" className={cn(buttonVariants({ variant: 'default' }))}>
            Create a team
        </Link>
    </div>
)

const ConfirmState = ({
    tournament,
    state,
}: {
    tournament: TournamentJoinInput
    state: UseTournamentJoinResult
}) => {
    const isOne = state.status === 'one-team'
    const teamToJoinWith = isOne ? state.eligibleTeams[0] : null

    return (
        <div className="flex flex-col gap-4">
            <PrizePanel tournament={tournament} />

            {isOne && teamToJoinWith ? (
                <SingleTeamSummary teamName={teamToJoinWith.name} bestScore={teamToJoinWith.best} />
            ) : (
                <TeamChooser state={state} />
            )}

            {state.submitError ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {state.submitError}
                </p>
            ) : null}

            <ConfirmFooter state={state} tournament={tournament} />
        </div>
    )
}

const PrizePanel = ({ tournament }: { tournament: TournamentJoinInput }) => (
    <div className="grid grid-cols-2 gap-3 rounded-xl border border-foreground/10 bg-muted/30 p-3 text-center text-sm">
        <div>
            <div className="text-xs text-muted-foreground">Prize pool</div>
            <div className="mt-0.5 font-anton text-xl text-primary">
                {tournament.prizePoolCredits.toLocaleString()} cr
            </div>
        </div>
        <div>
            <div className="text-xs text-muted-foreground">Entry fee</div>
            <div className="mt-0.5 font-anton text-xl">
                {tournament.entryFeeCredits === 0
                    ? 'Free'
                    : `${tournament.entryFeeCredits} cr`}
            </div>
        </div>
    </div>
)

const SingleTeamSummary = ({
    teamName,
    bestScore,
}: {
    teamName: string
    bestScore: number
}) => (
    <div className="flex items-center justify-between rounded-xl border border-foreground/10 px-4 py-3">
        <div>
            <div className="text-xs text-muted-foreground">Joining with</div>
            <div className="font-medium">{teamName}</div>
        </div>
        <div className="text-right">
            <div className="font-anton text-lg text-primary">{bestScore.toFixed(1)}</div>
            <div className="text-[11px] text-muted-foreground">best score</div>
        </div>
    </div>
)

const TeamChooser = ({ state }: { state: UseTournamentJoinResult }) => (
    <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Choose a team
        </div>
        <ul className="flex max-h-60 flex-col gap-1.5 overflow-y-auto">
            {state.eligibleTeams.map((team) => {
                const isSelected = state.selectedTeamId === team.id
                return (
                    <li key={team.id}>
                        <button
                            type="button"
                            onClick={() => state.selectTeam(team.id)}
                            className={cn(
                                'flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                                isSelected
                                    ? 'border-primary/40 bg-primary/5'
                                    : 'border-foreground/10 hover:bg-muted',
                            )}
                            aria-pressed={isSelected}
                        >
                            <div className="min-w-0">
                                <div className="truncate font-medium">{team.name}</div>
                                <div className="text-xs text-muted-foreground">
                                    {team.format} · {team.players} players
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-anton text-base text-primary">
                                    {team.proj.toFixed(1)}
                                </div>
                                <div className="text-[10px] text-muted-foreground">proj.</div>
                            </div>
                        </button>
                    </li>
                )
            })}
        </ul>
    </div>
)

const ConfirmFooter = ({
    state,
    tournament,
}: {
    state: UseTournamentJoinResult
    tournament: TournamentJoinInput
}) => {
    const isOne = state.status === 'one-team'
    const canConfirm = isOne || !!state.selectedTeamId
    const isLoading = state.status === 'submitting'

    return (
        <div className="flex items-center justify-end gap-2 border-t border-foreground/10 pt-3">
            <Button variant="outline" onClick={state.close} disabled={isLoading}>
                Cancel
            </Button>
            <Button onClick={() => void state.confirm()} disabled={!canConfirm || isLoading}>
                <HugeiconsIcon icon={Login02Icon} className="size-4" />
                {isLoading ? 'Joining…' : 'Confirm join'}
                {tournament.entryFeeCredits > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs opacity-90">
                        · <HugeiconsIcon icon={Coins01Icon} className="size-3" />
                        {tournament.entryFeeCredits}
                    </span>
                ) : null}
            </Button>
        </div>
    )
}
