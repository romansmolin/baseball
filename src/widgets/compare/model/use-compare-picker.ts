'use client'

import { useState } from 'react'

import { useBuilderTeamsData, usePlayersByTeamData } from '@/entities/team-builder'
import type { PlayerAnalytics } from '@/shared/analytics'

import { MAX_COMPARE_PLAYERS } from './compare-logic'

const LEAGUE = 'mlb'

export interface PickedPlayer {
    id: number
    name: string
    // "OF · NYY"
    detail: string
    photoUrl: string | null
}

// Team slider, then that team's roster; picked players are the comparison.
export function useComparePicker(ids: number[], players: PlayerAnalytics[], onPick: (id: number) => void) {
    const [teamId, setTeamId] = useState<number | null>(null)
    // A single pick has no comparison data yet (the API needs two), so what to show is remembered from the roster.
    const [remembered, setRemembered] = useState<Record<number, PickedPlayer>>({})

    const teams = useBuilderTeamsData(LEAGUE)
    const roster = usePlayersByTeamData({ leagueSlug: LEAGUE, teamId: teamId ?? undefined })

    const infoFor = (id: number): PickedPlayer => {
        const analytics = players.find((p) => p.player.id === id)?.player
        if (analytics) {
            return {
                id,
                name: analytics.fullName,
                detail: `${analytics.position} · ${analytics.teamAbbreviation ?? '—'}`,
                photoUrl: analytics.photoUrl,
            }
        }
        return remembered[id] ?? { id, name: `Player ${id}`, detail: '', photoUrl: null }
    }

    const sortedRoster = [...(roster.data ?? [])].sort((a, b) => a.name.localeCompare(b.name))

    return {
        teamId,
        toggleTeam: (id: number) => setTeamId((current) => (current === id ? null : id)),
        teams: [...(teams.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
        teamsLoading: teams.isLoading,
        teamsError: teams.error as Error | undefined,
        // Players without a single game this season would compare as a column of dashes, so they are left out.
        roster: sortedRoster.filter((p) => p.hasSeasonStats !== false),
        hiddenCount: sortedRoster.filter((p) => p.hasSeasonStats === false).length,
        rosterLoading: roster.isLoading,
        rosterError: roster.error as Error | undefined,
        selected: ids.map(infoFor),
        full: ids.length >= MAX_COMPARE_PLAYERS,
        pick: (player: PickedPlayer) => {
            setRemembered((prev) => ({ ...prev, [player.id]: player }))
            onPick(player.id)
        },
    }
}
