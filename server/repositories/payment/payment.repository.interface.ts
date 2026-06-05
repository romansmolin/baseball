import type { PaymentStatus } from '../../../src/generated/prisma/enums'

export interface PaymentRecord {
    id: string
    userId: string
    token: string
    gatewayUid: string | null
    status: PaymentStatus
    amountCents: number
    currency: string
    creditAmount: number
    description: string
    errorMessage: string | null
    createdAt: Date
    updatedAt: Date
}

export interface CreatePaymentInput {
    userId: string
    token: string
    amountCents: number
    currency: string
    creditAmount: number
    description: string
}

export interface IPaymentRepository {
    create(input: CreatePaymentInput): Promise<PaymentRecord>
    findByToken(token: string): Promise<PaymentRecord | null>
    updateStatus(
        id: string,
        status: PaymentStatus,
        gatewayUid?: string,
        errorMessage?: string,
    ): Promise<PaymentRecord>
}
