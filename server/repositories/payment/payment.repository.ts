// CRUD for the Payment row that tracks one credit-pack checkout through the
// gateway lifecycle. Never contains business logic — status normalization and
// credit-granting live in PaymentService. `token` is our own tracking id sent
// to the gateway; `gatewayUid` is the gateway's checkout token, learned once
// the session is created.

import type { PaymentStatus } from '../../../src/generated/prisma/enums'
import { prisma } from '../../lib/prisma'
import { handleRepositoryError } from '../../shared/db/prisma-error.utils'

import type {
    CreatePaymentInput,
    IPaymentRepository,
    PaymentRecord,
} from './payment.repository.interface'

export class PaymentRepository implements IPaymentRepository {
    async create(input: CreatePaymentInput): Promise<PaymentRecord> {
        try {
            return await prisma.payment.create({ data: input })
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async findByToken(token: string): Promise<PaymentRecord | null> {
        try {
            return await prisma.payment.findUnique({ where: { token } })
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async updateStatus(
        id: string,
        status: PaymentStatus,
        gatewayUid?: string,
        errorMessage?: string,
    ): Promise<PaymentRecord> {
        try {
            return await prisma.payment.update({
                where: { id },
                data: {
                    status,
                    ...(gatewayUid !== undefined ? { gatewayUid } : {}),
                    ...(errorMessage !== undefined ? { errorMessage } : {}),
                },
            })
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }
}
