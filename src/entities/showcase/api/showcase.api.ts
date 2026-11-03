import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'
import type { DailyContestDetail, DailyContestView, DailyContestSummary, DailyEntryRecord, DailyStanding, MyActiveDailyEntry, Page, SaveDailyEntryInput } from '@/shared/daily-contests'
import type { CommunityActivity, CommunityOverview, ManagerFilters, ManagerProfile, ManagerRow } from '@/shared/community'

const query = (values: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams()
    Object.entries(values).forEach(([key, value]) => { if (value !== undefined) params.set(key, String(value)) })
    return params.toString()
}
export const fetchDailyContests = withErrorHandling((view: DailyContestView, limit: number = 20, offset: number = 0) => httpClient.get<Page<DailyContestSummary>>(`/api/daily-contests?${query({ view, limit, offset })}`))
export const fetchFeaturedDailyContest = withErrorHandling(() => httpClient.get<DailyContestSummary | null>('/api/daily-contests/featured'))
export const fetchDailyContest = withErrorHandling((id: string) => httpClient.get<DailyContestDetail>(`/api/daily-contests/${encodeURIComponent(id)}`))
export const fetchDailyEntry = withErrorHandling((id: string) => httpClient.get<DailyEntryRecord | null>(`/api/me/daily-contests/${encodeURIComponent(id)}/entry`))
export const fetchMyActiveDailyEntries = withErrorHandling(() => httpClient.get<{ items: MyActiveDailyEntry[] }>('/api/me/daily-contests/entries'))
export const fetchDailyEntryForViewer = withErrorHandling((contestId: string, entryId: string) => httpClient.get<DailyEntryRecord>(`/api/daily-contests/${encodeURIComponent(contestId)}/entries/${encodeURIComponent(entryId)}`))
export const saveDailyEntry = withErrorHandling((id: string, input: SaveDailyEntryInput) => httpClient.put<DailyEntryRecord>(`/api/me/daily-contests/${encodeURIComponent(id)}/entry`, input))
export const fetchDailyStandings = withErrorHandling((id: string, offset: number = 0) => httpClient.get<Page<DailyStanding>>(`/api/daily-contests/${encodeURIComponent(id)}/standings?${query({ offset, limit: 20 })}`))
export const fetchCommunityOverview = withErrorHandling(() => httpClient.get<CommunityOverview>('/api/community/overview'))
export const fetchCommunityActivity = withErrorHandling((cursor?: string) => httpClient.get<{ items: CommunityActivity[]; nextCursor: string | null }>(`/api/community/activity?${query({ cursor, limit: 8 })}`))
export const fetchManagers = withErrorHandling((filters: ManagerFilters) => httpClient.get<Page<ManagerRow>>(`/api/managers?${query({ ...filters })}`))
export const fetchManager = withErrorHandling((id: string) => httpClient.get<ManagerProfile>(`/api/managers/${encodeURIComponent(id)}`))
export const refreshShowcase = withErrorHandling(() => httpClient.post('/api/me/showcase/refresh'))
