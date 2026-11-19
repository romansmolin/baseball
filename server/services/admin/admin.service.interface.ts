import type { AdminReportFile, AdminUserActivity } from '@/shared/admin'

export interface IAdminService {
    getUserActivity(adminId: string, email: string): Promise<AdminUserActivity>
    createUserReport(adminId: string, email: string): Promise<AdminReportFile>
}
