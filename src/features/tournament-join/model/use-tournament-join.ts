'use client'

import { useCallback, useMemo, useState } from 'react'
import { useSWRConfig } from 'swr'
import { toast } from 'sonner'

import { useMyTeamsData } from '@/entities/my-teams'
import { useMyTournamentsData } from '@/entities/tournaments'
import { ApiError } from '@/shared/api/api-error'
import type { League, Team } from '@/shared/teams'

import { joinTournament } from '../api/join-tournament'

import type { TournamentJoinInput } from './tournament-input.type'

export type TournamentJoinStatus =
    | 'idle'
    | 'loading'
    | 'error'
    | 'already-joined'
    | 'no-teams'
    | 'no-eligible-teams'
    | 'one-team'
    | 'many-teams'
    | 'submitting'
    | 'success'

export interface UseTournamentJoinArgs {
    tournament: TournamentJoinInput
}

export interface UseTournamentJoinResult {
    isOpen: boolean
    open: () => void
    close: () => void
    status: TournamentJoinStatus
    teams: Team[]
    eligibleTeams: Team[]
    league: League | null
    selectedTeamId: string | null
    isAlreadyJoined: boolean
    selectTeam: (id: string) => void
    confirm: () => Promise<void>
    teamsError: string | null
    submitError: string | null
    retryLoadTeams: () => void
}

const ERROR_CODE_TO_MESSAGE: Record<string, string> = {
    TOURNAMENT_NOT_FOUND: 'Tournament no longer exists.',
    TOURNAMENT_NOT_JOINABLE:
        'Joining is closed — this tournament is no longer accepting new members.',
    JOIN_WINDOW_CLOSED:
        'Tournament has started — joining is no longer available.',
    TEAM_NOT_FOUND: 'Selected team no longer exists.',
    TEAM_NOT_OWNED: "That team isn't yours.",
    TEAM_ALREADY_IN_LEAGUE: 'That team is already in another tournament.',
    LEAGUE_MISMATCH: "Selected team isn't in this tournament's league.",
    USER_ALREADY_JOINED:
        "You've already joined this tournament with another team.",
    VALIDATION_ERROR: 'Invalid request — please try again.',
    UNAUTHENTICATED: 'Please sign in to join a tournament.',
}

const FALLBACK_ERROR = 'Something went wrong. Please try again.'

const mapErrorCodeToMessage = (code: string | undefined): string =>
    (code && ERROR_CODE_TO_MESSAGE[code]) || FALLBACK_ERROR

export const useTournamentJoin = ({
    tournament,
}: UseTournamentJoinArgs): UseTournamentJoinResult => {
    const [isOpen, setIsOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [hasSucceeded, setHasSucceeded] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)

    const { data, error, isLoading, mutate: mutateTeams } = useMyTeamsData()
    const { data: myTournaments, mutate: mutateMyTournaments } =
        useMyTournamentsData()
    const { mutate: mutateGlobal } = useSWRConfig()

    const teams = data?.teams ?? []
    const leagues = data?.leagues ?? []

    const isAlreadyJoined = useMemo(
        () => (myTournaments ?? []).some((t) => t.id === tournament.id),
        [myTournaments, tournament.id],
    )

    const league = useMemo<League | null>(
        () => leagues.find((l) => l.slug === tournament.leagueSlug) ?? null,
        [leagues, tournament.leagueSlug],
    )

    const eligibleTeams = useMemo(
        () =>
            teams.filter(
                (team) =>
                    team.leagueSlug === tournament.leagueSlug &&
                    team.leagueMemberId === null,
            ),
        [teams, tournament.leagueSlug],
    )

    const status = useMemo<TournamentJoinStatus>(() => {
        if (hasSucceeded) return 'success'
        if (isSubmitting) return 'submitting'
        if (isLoading && !data) return 'loading'
        if (error) return 'error'
        // "already-joined" wins over the no-team variants: don't tell the user
        // to build a new team when their existing one is already in this
        // tournament.
        if (isAlreadyJoined) return 'already-joined'
        if (teams.length === 0) return 'no-teams'
        if (eligibleTeams.length === 0) return 'no-eligible-teams'
        if (eligibleTeams.length === 1) return 'one-team'
        return 'many-teams'
    }, [
        hasSucceeded,
        isSubmitting,
        isLoading,
        data,
        error,
        isAlreadyJoined,
        teams.length,
        eligibleTeams.length,
    ])

    const open = useCallback(() => {
        setIsOpen(true)
        setSubmitError(null)
        setHasSucceeded(false)
        setSelectedTeamId(null)
    }, [])

    const close = useCallback(() => {
        if (isSubmitting) return
        setIsOpen(false)
        setSubmitError(null)
        setHasSucceeded(false)
        setSelectedTeamId(null)
    }, [isSubmitting])

    const selectTeam = useCallback((id: string) => {
        setSelectedTeamId(id)
        setSubmitError(null)
    }, [])

    const confirm = useCallback(async () => {
        const teamId =
            selectedTeamId ?? (eligibleTeams.length === 1 ? eligibleTeams[0].id : null)
        if (!teamId) return

        setIsSubmitting(true)
        setSubmitError(null)

        try {
            await joinTournament(tournament.id, { fantasyTeamId: teamId })
            const joinedTeam = teams.find((t) => t.id === teamId)
            toast.success(
                `Joined ${tournament.name}${joinedTeam ? ` with ${joinedTeam.name}` : ''}`,
            )
            setHasSucceeded(true)
            await Promise.all([
                mutateTeams(),
                mutateMyTournaments(),
                mutateGlobal(['tournaments', 'progress', tournament.id]),
            ])
            setTimeout(() => {
                setIsOpen(false)
                setHasSucceeded(false)
                setSelectedTeamId(null)
            }, 600)
        } catch (err) {
            const code = ApiError.isApiError(err) ? err.code : undefined
            setSubmitError(mapErrorCodeToMessage(code))
        } finally {
            setIsSubmitting(false)
        }
    }, [
        selectedTeamId,
        eligibleTeams,
        tournament.id,
        tournament.name,
        teams,
        mutateTeams,
        mutateMyTournaments,
        mutateGlobal,
    ])

    const retryLoadTeams = useCallback(() => {
        void mutateTeams()
    }, [mutateTeams])

    return {
        isOpen,
        open,
        close,
        status,
        teams,
        eligibleTeams,
        league,
        selectedTeamId,
        isAlreadyJoined,
        selectTeam,
        confirm,
        teamsError: error ? (error as Error).message : null,
        submitError,
        retryLoadTeams,
    }
}
