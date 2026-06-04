'use client'

import { Cancel01Icon, InformationCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type { ApiError } from '@/shared/api/api-error'
import type {
    TournamentRecord,
    TournamentStandingsResponse,
} from '@/shared/tournaments'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'

import {
    formatDateRange,
    formatEntryFee,
    formatTournamentStatus,
    formatWeekProgress,
} from '../model/tournament-display'
import type { LeagueOption } from '../model/tournament.type'

import { JoinTournamentButtonSlot } from './join-tournament-button-slot'
import { StandingsTable } from './standings-table'
import { UserTournamentProgressSlot } from './user-tournament-progress-slot'

interface TournamentDetailPanelProps {
    tournament: TournamentRecord
    league: LeagueOption | undefined
    standings: TournamentStandingsResponse | undefined
    isLoadingStandings: boolean
    standingsError: ApiError | undefined
    onClose: () => void
}

export const TournamentDetailPanel = ({
    tournament,
    league,
    standings,
    isLoadingStandings,
    standingsError,
    onClose,
}: TournamentDetailPanelProps) => {
    return (
        <aside className="fixed inset-0 z-30 flex h-full flex-col bg-background lg:static lg:z-auto lg:w-96 lg:shrink-0 lg:border-l lg:border-foreground/10">
            <div className="flex items-start justify-between gap-2 p-4">
                <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">
                        {league?.name ?? tournament.leagueSlug.toUpperCase()} ·{' '}
                        {formatTournamentStatus(tournament.status)}
                    </div>
                    <div className="mt-0.5 font-medium">{tournament.name}</div>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={onClose}>
                    <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                </Button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
                <div className="flex flex-col items-center gap-1 rounded-xl bg-muted/40 p-4">
                    <div className="text-xs text-muted-foreground">Prize pool</div>
                    <div className="font-anton text-4xl text-primary">
                        {tournament.prizePoolCredits.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">credits</div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                    <InfoStat label="Entry fee" value={formatEntryFee(tournament.entryFeeCredits)} />
                    <InfoStat
                        label="Members"
                        value={tournament.memberCount.toLocaleString()}
                    />
                    <InfoStat
                        label="Progress"
                        value={formatWeekProgress(tournament)}
                    />
                    <InfoStat
                        label="Schedule"
                        value={formatDateRange(tournament.startsAt, tournament.endsAt)}
                    />
                </div>

                <Separator />

                <Section title={`Standings · top 10`}>
                    <StandingsTable
                        standings={standings}
                        isLoading={isLoadingStandings}
                        error={standingsError}
                        limit={10}
                    />
                </Section>

                <Separator />

                <UserTournamentProgressSlot tournamentId={tournament.id} />
            </div>

            <div className="flex flex-col gap-2 border-t border-foreground/10 p-4">
                {(tournament.status === 'IN_SEASON' ||
                    tournament.status === 'PLAYOFFS') && (
                    <LateJoinNotice currentWeek={tournament.currentWeek} />
                )}
                <JoinTournamentButtonSlot
                    tournament={{
                        id: tournament.id,
                        name: tournament.name,
                        leagueSlug: tournament.leagueSlug,
                        entryFeeCredits: tournament.entryFeeCredits,
                        prizePoolCredits: tournament.prizePoolCredits,
                        status: tournament.status,
                        startsAt: tournament.startsAt,
                    }}
                />
            </div>
        </aside>
    )
}

const LateJoinNotice = ({ currentWeek }: { currentWeek: number }) => (
    <div className="flex items-start gap-2 rounded-md border border-foreground/10 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <HugeiconsIcon
            icon={InformationCircleIcon}
            className="mt-0.5 size-3.5 shrink-0 text-primary"
        />
        <span>
            Join now — you&apos;ll score from week {currentWeek + 1} onward. Past weeks count
            as 0 for you.
        </span>
    </div>
)

const InfoStat = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
    </div>
)

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {title}
        </div>
        {children}
    </div>
)

