import { describe, expect, it, vi } from 'vitest'

import type { IAdminRepository, UserActivityRecord } from '../../../repositories/admin/admin.repository.interface'
import { AdminService } from '../admin.service'

const record: UserActivityRecord = {
    user: {
        id: 'u1',
        email: 'a@b.co',
        name: 'Zoë Ünal',
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true,
        createdAt: new Date('2026-01-02T03:04:05Z'),
    },
    teams: [],
    transactions: [
        { id: 't2', amount: -5, balanceAfter: 95, type: 'AI_USAGE', status: 'COMPLETED', createdAt: new Date('2026-02-02') },
        { id: 't1', amount: 100, balanceAfter: 100, type: 'PURCHASE', status: 'COMPLETED', createdAt: new Date('2026-02-01') },
    ],
    payments: [],
}

const build = (role: 'ADMIN' | 'USER' | null, found: UserActivityRecord | null = record) => {
    const repo: IAdminRepository = {
        findUserRole: vi.fn().mockResolvedValue(role ? { role, status: 'ACTIVE' } : null),
        findUserActivityByEmail: vi.fn().mockResolvedValue(found),
    }
    return { repo, service: new AdminService(repo) }
}

describe('AdminService', () => {
    it('refuses non-admin callers without touching user data', async () => {
        const { repo, service } = build('USER')
        await expect(service.getUserActivity('c1', 'a@b.co')).rejects.toMatchObject({ statusCode: 403 })
        expect(repo.findUserActivityByEmail).not.toHaveBeenCalled()
    })

    it('returns 404 when the looked-up user does not exist', async () => {
        const { service } = build('ADMIN', null)
        await expect(service.getUserActivity('c1', 'x@y.co')).rejects.toMatchObject({ statusCode: 404 })
    })

    it('takes the balance from the newest ledger row and serializes dates', async () => {
        const { service } = build('ADMIN')
        const activity = await service.getUserActivity('c1', 'a@b.co')
        expect(activity.balance).toBe(95)
        expect(activity.user.createdAt).toBe('2026-01-02T03:04:05.000Z')
    })

    it('renders a PDF report even for non-Latin names', async () => {
        const { service } = build('ADMIN')
        const file = await service.createUserReport('c1', 'a@b.co')
        expect(file.contentType).toBe('application/pdf')
        expect(Buffer.from(file.base64, 'base64').subarray(0, 4).toString()).toBe('%PDF')
    })
})
