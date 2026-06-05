import type {
    CreditTransactionStatus,
    CreditTransactionType,
} from '../../../src/generated/prisma/enums'

export interface CreditTransactionRecord {
    id: string
    userId: string
    amount: number
    balanceAfter: number
    type: CreditTransactionType
    status: CreditTransactionStatus
    referenceType: string | null
    referenceId: string | null
    createdAt: Date
}

export interface GrantCreditsInput {
    userId: string
    amount: number
    type: CreditTransactionType
    referenceType?: string
    referenceId?: string
}

export interface ICreditRepository {
    getBalance(userId: string): Promise<number>
    getTransactions(userId: string, limit?: number): Promise<CreditTransactionRecord[]>
    // Appends a COMPLETED credit transaction, computing the new running
    // balance atomically inside a single DB transaction.
    grantCredits(input: GrantCreditsInput): Promise<CreditTransactionRecord>
}
