import { ApiError } from '../../../../../server/errors/api.error'
import { buildPaymentController } from '../../../../../server/services/payment/payment.composition'
import { getAuthenticatedUser } from '../../../../../server/shared/auth.utils'

const paymentController = buildPaymentController()

export async function POST(request: Request) {
    const user = await getAuthenticatedUser()
    if (!user) return ApiError.unauthorized().toResponse()

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return ApiError.validationError('Invalid JSON body').toResponse()
    }

    return paymentController.createCheckout(body, user.id)
}
