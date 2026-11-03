'use client'

import { useDailyStandingsData, useManagerData, useManagersData, useMyActiveDailyEntriesData, useShowcaseRefresh } from '@/entities/showcase'
import { useContestCatalogData, useMyTournamentsData } from '@/entities/tournaments'
import { groupContestsBySchedule, selectNextContest } from './dashboard-home'
import { useShowcaseClock } from './use-showcase-state'

const RESULT_ROWS = 4
const STANDINGS_WINDOW = 50

export function useTodayState(userId?: string) {
    const now = useShowcaseClock()
    const current = useContestCatalogData({ view: 'current', limit: 100, offset: 0 })
    const history = useContestCatalogData({ view: 'history', limit: RESULT_ROWS, offset: 0 })
    const activeDaily = useMyActiveDailyEntriesData(!!userId)
    const activeTournaments = useMyTournamentsData(!!userId)
    const profile = useManagerData(userId ?? null)

    const items = current.data?.items ?? []
    const enteredIds = new Set([
        ...(activeDaily.data?.items.map(entry => entry.contestId) ?? []),
        ...(activeTournaments.data?.map(tournament => tournament.id) ?? []),
    ])
    const myPoints = new Map((profile.data?.history ?? []).map(entry => [entry.contest.id, entry.points]))

    return {
        next: selectNextContest(items, now?.getTime() ?? Number.NaN),
        schedule: groupContestsBySchedule(items, now?.getTime() ?? Number.NaN),
        finished: history.data?.items ?? [],
        enteredIds,
        myPoints,
        now,
        hasEntries: enteredIds.size > 0 || (profile.data?.entries ?? 0) > 0,
        loading: !now || (current.isLoading && !current.data),
        resultsLoading: history.isLoading && !history.data,
        failed: !!current.error && !current.data,
        resultsFailed: !!history.error && !history.data,
        retry: () => { void current.mutate() },
    }
}

export function useSeasonStandings(userId?: string) {
    const standings = useManagersData({ mode: 'LIVE', period: 'season', limit: STANDINGS_WINDOW, offset: 0 })
    const ranked = (standings.data?.items ?? []).filter(manager => manager.rank !== null)

    return {
        top: ranked.slice(0, 5),
        leader: ranked[0] ?? null,
        me: userId ? ranked.find(manager => manager.userId === userId) ?? null : null,
        total: standings.data?.total ?? 0,
        loading: standings.isLoading && !standings.data,
        failed: !!standings.error && !standings.data,
    }
}

export function useContestLeader(contestId: string) {
    const { data, isLoading } = useDailyStandingsData(contestId)
    return { leader: data?.items[0] ?? null, loading: isLoading && !data }
}

export function useDashboardHome(userId: string) {
    useShowcaseRefresh(true)
    return { today: useTodayState(userId), season: useSeasonStandings(userId) }
}
