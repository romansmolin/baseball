import { ApiError } from '../../../../../../../server/errors/api.error'
import { buildPaymentController } from '../../../../../../../server/services/payment/payment.composition'

const paymentController = buildPaymentController()

// Polled by the payment-status page to watch a payment flip to a terminal
// state (the webhook lands asynchronously). Reads our Payment row only.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params
    if (!token) {
        return ApiError.validationError('Missing token').toResponse()
    }
    return paymentController.getStatus(token)
}
