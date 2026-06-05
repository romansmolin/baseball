// HTTP boundary for the payment gateway. Validates input, delegates to
// PaymentService, and shapes responses. The webhook handler never throws to
// the route — it always returns a JSON ack/Nack with the right status so the
// gateway's retry logic behaves. handleReturn builds a redirect to the
// public payment-status page the user lands on after the hosted checkout.

import { ApiError } from '../../errors/api.error'
import { ErrorCode } from '../../errors/error-code.enum'
import { createCheckoutSchema } from '../../entities/payment/payment.schema'
import type { IPaymentService } from '../../services/payment/payment.service.interface'

import type { IPaymentController } from './payment.controller.interface'

const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export class PaymentController implements IPaymentController {
    private readonly paymentService: IPaymentService

    constructor(paymentService: IPaymentService) {
        this.paymentService = paymentService
    }

    async createCheckout(body: unknown, userId: string): Promise<Response> {
        try {
            const result = createCheckoutSchema.safeParse(body)
            if (!result.success) {
                return ApiError.validationError(result.error.issues[0].message).toResponse()
            }

            const { redirectUrl } = await this.paymentService.createCheckout(
                userId,
                result.data.credits,
            )
            return Response.json({ redirectUrl })
        } catch (error) {
            return this.handleError(error)
        }
    }

    async handleWebhook(
        rawBody: string,
        headers: { authorization: string | null; signature: string | null },
    ): Promise<Response> {
        try {
            await this.paymentService.handleWebhook(rawBody, headers)
            return Response.json({ received: true })
        } catch (error) {
            if (error instanceof ApiError) {
                return error.toResponse()
            }
            console.error('[PaymentController] webhook', error)
            return ApiError.internal('Webhook processing failed').toResponse()
        }
    }

    async handleReturn(token: string | null): Promise<Response> {
        const redirectTo = (
            destination: 'success' | 'pending' | 'failed',
            t?: string | null,
        ): Response => {
            const params = new URLSearchParams({ status: destination })
            if (t) params.set('token', t)
            return Response.redirect(
                `${appUrl}/payments/secure-processor/${destination}?${params.toString()}`,
            )
        }

        if (!token) return redirectTo('failed', null)

        try {
            const result = await this.paymentService.reconcileReturn(token)
            const destination =
                result.status === 'SUCCESSFUL'
                    ? 'success'
                    : result.status === 'PENDING'
                      ? 'pending'
                      : 'failed'
            return redirectTo(destination, token)
        } catch (error) {
            console.error('[PaymentController] return', error)
            return redirectTo('failed', token)
        }
    }

    async getStatus(token: string): Promise<Response> {
        try {
            const status = await this.paymentService.getStatus(token)
            return Response.json(status)
        } catch (error) {
            return this.handleError(error)
        }
    }

    private handleError(error: unknown): Response {
        if (error instanceof ApiError) {
            return error.toResponse()
        }
        console.error('[PaymentController]', error)
        return new ApiError(
            500,
            ErrorCode.INTERNAL_ERROR,
            'Internal server error',
        ).toResponse()
    }
}
