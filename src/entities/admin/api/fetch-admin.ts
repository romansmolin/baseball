import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'
import type { AdminReportFile, AdminUserActivity } from '@/shared/admin'

export const fetchUserActivity = withErrorHandling(
    async (email: string): Promise<AdminUserActivity> =>
        httpClient.post<AdminUserActivity>('/api/admin/user-activity', { email }),
)

export const fetchUserReport = withErrorHandling(
    async (email: string): Promise<AdminReportFile> =>
        httpClient.post<AdminReportFile>('/api/admin/user-report', { email }),
)
