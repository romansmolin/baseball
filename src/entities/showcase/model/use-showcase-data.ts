'use client'
import useSWR from 'swr'
import type { ApiError } from '@/shared/api/api-error'
import type { DailyContestView } from '@/shared/daily-contests'
import type { ManagerFilters } from '@/shared/community'
import { fetchDailyContests, fetchFeaturedDailyContest, fetchDailyContest, fetchDailyEntry, fetchMyActiveDailyEntries, fetchDailyEntryForViewer, fetchDailyStandings, fetchCommunityOverview, fetchCommunityActivity, fetchManagers, fetchManager, refreshShowcase } from '../api/showcase.api'
const options = { refreshInterval: 60000, refreshWhenHidden: false, revalidateOnFocus: true }
export const useDailyContestsData = (view: DailyContestView, limit = 20, offset = 0) => useSWR(['daily-contests', view, limit, offset], () => fetchDailyContests(view, limit, offset), options)
export const useFeaturedDailyContestData = () => useSWR('daily-contest-featured', fetchFeaturedDailyContest, options)
export const useDailyContestData = (id: string | null) => useSWR(id ? ['daily-contest', id] : null, () => fetchDailyContest(id!), options)
export const useDailyEntryData = (id: string | null) => useSWR(id ? ['daily-entry', id] : null, () => fetchDailyEntry(id!), options)
export const useMyActiveDailyEntriesData = (enabled = true) => useSWR(enabled ? 'my-active-daily-entries' : null, fetchMyActiveDailyEntries, options)
export const useDailyEntryForViewerData = (contestId: string, entryId: string | null) => useSWR(entryId ? ['daily-entry-view', contestId, entryId] : null, () => fetchDailyEntryForViewer(contestId, entryId!), options)
export const useDailyStandingsData = (id: string, offset = 0) => useSWR(['daily-standings', id, offset], () => fetchDailyStandings(id, offset), options)
export const useCommunityOverviewData = () => useSWR<Awaited<ReturnType<typeof fetchCommunityOverview>>, ApiError>('community-overview', fetchCommunityOverview, options)
export const useCommunityActivityData = () => useSWR('community-activity', () => fetchCommunityActivity(), options)
export const useManagersData = (filters: ManagerFilters) => useSWR(['managers', filters.mode, filters.period, filters.limit, filters.offset], () => fetchManagers(filters), options)
export const useManagerData = (id: string) => useSWR(['manager', id], () => fetchManager(id), options)
export const useShowcaseRefresh = (authenticated: boolean) => useSWR(authenticated ? 'showcase-refresh' : null, refreshShowcase, { refreshInterval: 60000, refreshWhenHidden: false, revalidateOnFocus: false, shouldRetryOnError: false, dedupingInterval: 60000 })
