import { groupActivity } from './group-activity'

import { ApiError } from '../../errors/api.error'
import { ErrorCode } from '../../errors/error-code.enum'
import type { IAdminRepository } from '../../repositories/admin/admin.repository.interface'

import type { IAdminService } from './admin.service.interface'
import { renderUserReportPdf } from './render-user-report-pdf'
import type { AdminReportFile, AdminUserActivity } from '@/shared/admin'

export class AdminService implements IAdminService {
    private readonly adminRepository: IAdminRepository

    constructor(adminRepository: IAdminRepository) {
        this.adminRepository = adminRepository
    }

    async getUserActivity(adminId: string, email: string): Promise<AdminUserActivity> {
        await this.assertAdmin(adminId)

        const record = await this.adminRepository.findUserActivityByEmail(email)
        if (!record) throw ApiError.notFound(ErrorCode.USER_NOT_FOUND, 'User not found')

        const { user } = record
        return {
            user: { ...user, balance: record.transactions[0]?.balanceAfter ?? 0, createdAt: user.createdAt.toISOString() },
            balance: record.transactions[0]?.balanceAfter ?? 0,
            batches: groupActivity(record.activity ?? []).map((batch) => ({ ...batch, startedAt: batch.startedAt.toISOString(), endedAt: batch.endedAt.toISOString() })),
            purchases: record.payments.map((payment) => ({ ...payment, credits: payment.creditAmount, createdAt: payment.createdAt.toISOString() })),
            teams: record.teams.map((team) => ({ ...team, createdAt: team.createdAt.toISOString() })),
            transactions: record.transactions.map((tx) => ({ ...tx, createdAt: tx.createdAt.toISOString() })),
            payments: record.payments.map((payment) => ({
                ...payment,
                createdAt: payment.createdAt.toISOString(),
            })),
        }
    }

    async createUserReport(adminId: string, email: string): Promise<AdminReportFile> {
        const activity = await this.getUserActivity(adminId, email)
        const file = { contentType: 'application/pdf', base64: await renderUserReportPdf(activity) }
        return { ...file, file }
    }

    // Fails closed: unknown, suspended or non-admin users are all refused.
    private async assertAdmin(userId: string): Promise<void> {
        const caller = await this.adminRepository.findUserRole(userId)
        if (!caller || caller.role !== 'ADMIN' || caller.status !== 'ACTIVE') throw ApiError.forbidden()
    }
}
