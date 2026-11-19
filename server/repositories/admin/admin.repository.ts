import { prisma } from '../../lib/prisma'
import { handleRepositoryError } from '../../shared/db/prisma-error.utils'

import type { IAdminRepository, UserActivityRecord } from './admin.repository.interface'

const LIST_LIMIT = 100

export class AdminRepository implements IAdminRepository {
    async findUserRole(userId: string) {
        try {
            return await prisma.user.findUnique({
                where: { id: userId },
                select: { role: true, status: true },
            })
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async findUserActivityByEmail(email: string): Promise<UserActivityRecord | null> {
        try {
            const user = await prisma.user.findFirst({
                where: { email: { equals: email, mode: 'insensitive' } },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    status: true,
                    emailVerified: true,
                    createdAt: true,
                    aiUsage: { orderBy: { createdAt: 'desc' }, take: 5000, select: { id: true, status: true, costCredits: true, createdAt: true, feature: { select: { key: true } } } },
                    fantasyTeams: {
                        orderBy: { createdAt: 'desc' },
                        take: LIST_LIMIT,
                        select: { id: true, name: true, leagueSlug: true, format: true, createdAt: true },
                    },
                    creditLedger: {
                        orderBy: { createdAt: 'desc' },
                        take: LIST_LIMIT,
                        select: {
                            id: true,
                            amount: true,
                            balanceAfter: true,
                            type: true,
                            status: true,
                            createdAt: true,
                        },
                    },
                    payments: {
                        orderBy: { createdAt: 'desc' },
                        take: LIST_LIMIT,
                        select: {
                            id: true,
                            status: true,
                            amountCents: true,
                            currency: true,
                            creditAmount: true,
                            description: true,
                            createdAt: true,
                        },
                    },
                },
            })
            if (!user) return null

            const { fantasyTeams, creditLedger, payments, aiUsage, ...rest } = user
            return { user: rest, teams: fantasyTeams, transactions: creditLedger, payments, activity: aiUsage.map(({ feature, ...row }) => ({ ...row, feature: feature.key })) }
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }
}
