import { buildPaymentController } from '../../../../../server/services/payment/payment.composition'

const paymentController = buildPaymentController()

// Where the gateway sends the user's browser after the hosted checkout. We
// reconcile the final status, then the controller redirects to the public
// payment-status page.
export async function GET(request: Request) {
    const token = new URL(request.url).searchParams.get('token')
    return paymentController.handleReturn(token)
}
