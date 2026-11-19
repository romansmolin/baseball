import type {
    CreditTransactionStatus,
    CreditTransactionType,
    PaymentStatus,
    UserRole,
    UserStatus,
} from '../../../src/generated/prisma/enums'

export interface UserActivityRecord {
    user: {
        id: string
        email: string
        name: string
        role: UserRole
        status: UserStatus
        emailVerified: boolean
        createdAt: Date
    }
    activity?: { id: string; feature: string; status: string; costCredits: number; createdAt: Date }[]
    teams: { id: string; name: string; leagueSlug: string; format: string; createdAt: Date }[]
    // Newest first, so the first row's balanceAfter is the live balance.
    transactions: {
        id: string
        amount: number
        balanceAfter: number
        type: CreditTransactionType
        status: CreditTransactionStatus
        createdAt: Date
    }[]
    payments: {
        id: string
        status: PaymentStatus
        amountCents: number
        currency: string
        creditAmount: number
        description: string
        createdAt: Date
    }[]
}

export interface IAdminRepository {
    findUserRole(userId: string): Promise<{ role: UserRole; status: UserStatus } | null>
    findUserActivityByEmail(email: string): Promise<UserActivityRecord | null>
}
