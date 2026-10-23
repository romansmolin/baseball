// Orchestrates a credit-pack purchase end to end:
//   createCheckout   → validate pack, open a Payment row + gateway session
//   handleWebhook    → verify gateway notification, grant credits on success
//   reconcileReturn  → poll the gateway when the user lands back on our site
//
// Credits are granted by appending a PURCHASE row to the CreditTransaction
// ledger (referenceType = 'payment', referenceId = Payment.id). The Payment
// row's own status guards against double-granting: once it is SUCCESSFUL we
// never grant again, so the webhook and the return reconcile are idempotent
// with respect to each other.

import { randomUUID } from 'crypto'

import { ApiError } from '../../errors/api.error'
import { ErrorCode } from '../../errors/error-code.enum'
import type { ICreditRepository } from '../../repositories/credit/credit.repository.interface'
import type { IPaymentRepository } from '../../repositories/payment/payment.repository.interface'
import type { IUserRepository } from '../../repositories/user/user.repository.interface'
import { CreditTransactionType } from '../../../src/generated/prisma/enums'

import {
    CUSTOM_MAX_AMOUNT_CENTS,
    CUSTOM_MIN_AMOUNT_CENTS,
    getCreditPack,
    quoteCustomPurchase,
} from './credit-pricing'
import {
    secureProcessorClient,
    verifyWebhookBasicAuth,
    verifyWebhookSignature,
} from './secure-processor.client'
import type { CreateCheckoutInput, IPaymentService } from './payment.service.interface'

type NormalizedStatus = 'CREATED' | 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'DECLINED' | 'EXPIRED' | 'ERROR'

const normalizeStatus = (status?: string | null): NormalizedStatus => {
    const normalized = (status ?? '').toLowerCase()

    if (['successful', 'success', 'completed', 'paid', 'approved'].includes(normalized)) return 'SUCCESSFUL'

    if (['failed', 'failure'].includes(normalized)) return 'FAILED'

    if (['declined', 'rejected', 'canceled', 'cancelled'].includes(normalized)) return 'DECLINED'

    if (normalized === 'expired') return 'EXPIRED'

    if (normalized === 'error') return 'ERROR'

    return 'PENDING'
}

export class PaymentService implements IPaymentService {
    private readonly paymentRepository: IPaymentRepository
    private readonly creditRepository: ICreditRepository
    private readonly userRepository: IUserRepository

    constructor(
        paymentRepository: IPaymentRepository,
        creditRepository: ICreditRepository,
        userRepository: IUserRepository,
    ) {
        this.paymentRepository = paymentRepository
        this.creditRepository = creditRepository
        this.userRepository = userRepository
    }

    async createCheckout(
        userId: string,
        input: CreateCheckoutInput,
    ): Promise<{ redirectUrl: string }> {
        const purchase = this.resolvePurchase(input)
        const user = await this.userRepository.findById(userId)

        if (!user) {
            throw ApiError.notFound(ErrorCode.USER_NOT_FOUND, `User not found: ${userId}`)
        }

        const token = randomUUID()

        const payment = await this.paymentRepository.create({
            userId,
            token,
            amountCents: purchase.priceCents,
            currency: purchase.currency,
            creditAmount: purchase.credits,
            description: `Purchase ${purchase.credits} credits`,
        })

        try {
            const checkout = await secureProcessorClient.createCheckout({
                amountCents: purchase.priceCents,
                currency: purchase.currency,
                description: '03ad5874-fd3d-4d43-ac56-0ff14f61d8ff',
                trackingId: payment.token,
                userId,
                email: user.email,
                birthDate: user.dateOfBirth ?? undefined,
            })

            await this.paymentRepository.updateStatus(payment.id, 'PENDING', checkout.token)

            return { redirectUrl: checkout.redirectUrl }
        } catch (error) {
            await this.paymentRepository.updateStatus(
                payment.id,
                'FAILED',
                undefined,
                error instanceof Error ? error.message : 'Gateway error',
            )

            throw new ApiError(
                502,
                ErrorCode.PAYMENT_GATEWAY_ERROR,
                'Could not start checkout. Please try again.',
            )
        }
    }

    // Turns whatever the client asked for into the amount actually charged and
    // the credits actually granted. Both branches are derived from the
    // server-owned pricing table — the client never supplies a price.
    private resolvePurchase(input: CreateCheckoutInput): {
        credits: number
        priceCents: number
        currency: string
    } {
        if (input.credits != null) {
            const pack = getCreditPack(input.credits)

            if (!pack) {
                throw new ApiError(
                    400,
                    ErrorCode.INVALID_CREDIT_PACK,
                    `Invalid credit pack: ${input.credits}`,
                )
            }

            return {
                credits: pack.credits,
                priceCents: pack.priceCents,
                currency: pack.currency,
            }
        }

        const quote = input.amountCents != null ? quoteCustomPurchase(input.amountCents) : undefined

        if (!quote) {
            throw new ApiError(
                400,
                ErrorCode.INVALID_CREDIT_AMOUNT,
                `Amount must be between ${CUSTOM_MIN_AMOUNT_CENTS} and ${CUSTOM_MAX_AMOUNT_CENTS} cents`,
            )
        }

        return quote
    }

    async handleWebhook(
        rawBody: string,
        headers: { authorization: string | null; signature: string | null },
    ): Promise<void> {
        if (!verifyWebhookBasicAuth(headers.authorization)) {
            throw new ApiError(401, ErrorCode.WEBHOOK_UNAUTHORIZED, 'Invalid webhook authorization')
        }

        if (!headers.signature || !verifyWebhookSignature(rawBody, headers.signature)) {
            throw new ApiError(401, ErrorCode.WEBHOOK_UNAUTHORIZED, 'Invalid webhook signature')
        }

        let payload: unknown

        try {
            payload = JSON.parse(rawBody)
        } catch {
            throw new ApiError(400, ErrorCode.WEBHOOK_INVALID, 'Webhook body is not valid JSON')
        }

        const data = payload as Record<string, unknown>
        const transaction = (data.transaction ?? data) as Record<string, unknown>
        const order = ((transaction.order ?? data.order) as Record<string, unknown> | undefined) ?? {}
        const metadata = (data.metadata ?? transaction.metadata) as Record<string, unknown> | undefined
        const token =
            (transaction.tracking_id as string | undefined) ??
            (order.tracking_id as string | undefined) ??
            (metadata?.payment_token_id as string | undefined)
        const rawStatus = (transaction.status ?? data.status) as string | undefined

        if (!token) throw new ApiError(400, ErrorCode.WEBHOOK_INVALID, 'Missing tracking_id in webhook')

        const payment = await this.paymentRepository.findByToken(token)

        if (!payment) throw new ApiError(404, ErrorCode.PAYMENT_NOT_FOUND, `Payment not found: ${token}`)

        const webhookAmount =
            typeof order.amount === 'number'
                ? order.amount
                : typeof transaction.amount === 'number'
                  ? (transaction.amount as number)
                  : null
        const webhookCurrency = (order.currency ?? transaction.currency) as string | undefined
        const txUid = transaction.uid as string | undefined

        if (webhookAmount !== null && webhookAmount !== payment.amountCents) {
            await this.paymentRepository.updateStatus(payment.id, 'ERROR', txUid, 'Amount mismatch')
            throw new ApiError(422, ErrorCode.WEBHOOK_INVALID, 'Webhook amount mismatch')
        }

        if (webhookCurrency && webhookCurrency !== payment.currency) {
            await this.paymentRepository.updateStatus(payment.id, 'ERROR', txUid, 'Currency mismatch')
            throw new ApiError(422, ErrorCode.WEBHOOK_INVALID, 'Webhook currency mismatch')
        }

        // Already finalized — nothing to do (idempotent webhook delivery).
        if (payment.status === 'SUCCESSFUL') return

        const status = normalizeStatus(rawStatus)

        if (status === 'SUCCESSFUL') {
            await this.paymentRepository.updateStatus(payment.id, 'SUCCESSFUL', txUid)
            await this.creditRepository.grantCredits({
                userId: payment.userId,
                amount: payment.creditAmount,
                type: CreditTransactionType.PURCHASE,
                referenceType: 'payment',
                referenceId: payment.id,
            })
        } else if (
            status === 'FAILED' ||
            status === 'ERROR' ||
            status === 'DECLINED' ||
            status === 'EXPIRED'
        ) {
            await this.paymentRepository.updateStatus(payment.id, status, txUid)
        }
    }

    async reconcileReturn(token: string): Promise<{ status: 'SUCCESSFUL' | 'PENDING' | 'FAILED' }> {
        const payment = await this.paymentRepository.findByToken(token)

        if (!payment) throw new ApiError(404, ErrorCode.PAYMENT_NOT_FOUND, `Payment not found: ${token}`)

        if (payment.status === 'SUCCESSFUL') return { status: 'SUCCESSFUL' }

        if (!payment.gatewayUid) {
            return { status: 'PENDING' }
        }

        const remote = await secureProcessorClient.queryCheckout(payment.gatewayUid)

        if (remote.amountCents !== null && remote.amountCents !== payment.amountCents) {
            await this.paymentRepository.updateStatus(payment.id, 'ERROR', remote.uid ?? undefined, 'Amount mismatch')

            return { status: 'FAILED' }
        }

        if (remote.currency && remote.currency !== payment.currency) {
            await this.paymentRepository.updateStatus(payment.id, 'ERROR', remote.uid ?? undefined, 'Currency mismatch')

            return { status: 'FAILED' }
        }

        const status = normalizeStatus(remote.status)

        if (status === 'SUCCESSFUL') {
            await this.paymentRepository.updateStatus(payment.id, 'SUCCESSFUL', remote.uid ?? undefined)
            await this.creditRepository.grantCredits({
                userId: payment.userId,
                amount: payment.creditAmount,
                type: CreditTransactionType.PURCHASE,
                referenceType: 'payment',
                referenceId: payment.id,
            })

            return { status: 'SUCCESSFUL' }
        }

        if (status === 'PENDING') {
            return { status: 'PENDING' }
        }

        await this.paymentRepository.updateStatus(payment.id, status, remote.uid ?? undefined)

        return { status: 'FAILED' }
    }

    async getStatus(token: string): Promise<{
        status: string
        amountCents: number
        currency: string
        creditAmount: number
        updatedAt: string
    }> {
        const payment = await this.paymentRepository.findByToken(token)

        if (!payment) throw new ApiError(404, ErrorCode.PAYMENT_NOT_FOUND, `Payment not found: ${token}`)

        return {
            status: payment.status,
            amountCents: payment.amountCents,
            currency: payment.currency,
            creditAmount: payment.creditAmount,
            updatedAt: payment.updatedAt.toISOString(),
        }
    }
}
