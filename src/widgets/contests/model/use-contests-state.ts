'use client'

import { useMemo, useState } from 'react'

import { contests, leagues } from './mock-data'
import { filterContests, sortContests } from './contest-filters'
import type { Contest, League, SortKey, StatusFilter } from './contest.type'

export interface ContestsState {
    leagues: League[]
    filteredLeagues: League[]
    contestsByLeague: Map<string, number>
    visibleContests: Contest[]
    selectedLeagueSlug: string | null
    selectedLeague: League | null
    statusFilter: StatusFilter
    sortKey: SortKey
    leagueSearch: string
    selectedContestId: string | null
    selectedContest: Contest | null
    setSelectedLeagueSlug: (slug: string | null) => void
    setStatusFilter: (status: StatusFilter) => void
    setSortKey: (sort: SortKey) => void
    setLeagueSearch: (q: string) => void
    setSelectedContestId: (id: string | null) => void
}

export const useContestsState = (): ContestsState => {
    const [selectedLeagueSlug, setSelectedLeagueSlug] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [sortKey, setSortKey] = useState<SortKey>('prize')
    const [leagueSearch, setLeagueSearch] = useState('')
    const [selectedContestId, setSelectedContestId] = useState<string | null>(null)

    const contestsByLeague = useMemo(() => {
        const map = new Map<string, number>()
        for (const c of contests) map.set(c.leagueSlug, (map.get(c.leagueSlug) ?? 0) + 1)
        return map
    }, [])

    const filteredLeagues = useMemo(() => {
        const q = leagueSearch.trim().toLowerCase()
        if (!q) return leagues
        return leagues.filter((l) => l.name.toLowerCase().includes(q))
    }, [leagueSearch])

    const visibleContests = useMemo(
        () =>
            sortContests(
                filterContests(contests, { leagueSlug: selectedLeagueSlug, status: statusFilter }),
                sortKey,
            ),
        [selectedLeagueSlug, statusFilter, sortKey],
    )

    const selectedLeague = useMemo(
        () => leagues.find((l) => l.slug === selectedLeagueSlug) ?? null,
        [selectedLeagueSlug],
    )

    const selectedContest = useMemo(
        () => contests.find((c) => c.id === selectedContestId) ?? null,
        [selectedContestId],
    )

    return {
        leagues,
        filteredLeagues,
        contestsByLeague,
        visibleContests,
        selectedLeagueSlug,
        selectedLeague,
        statusFilter,
        sortKey,
        leagueSearch,
        selectedContestId,
        selectedContest,
        setSelectedLeagueSlug: (slug) => {
            setSelectedLeagueSlug(slug)
            setSelectedContestId(null)
        },
        setStatusFilter,
        setSortKey,
        setLeagueSearch,
        setSelectedContestId,
    }
}
