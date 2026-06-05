import { buildPaymentController } from '../../../../../server/services/payment/payment.composition'

const paymentController = buildPaymentController()

// Gateway-to-server notification. We read the raw body (signature is computed
// over the exact bytes) and pass the auth + signature headers through for
// verification inside the service.
export async function POST(request: Request) {
    const rawBody = await request.text()
    const authorization =
        request.headers.get('Authorization') ?? request.headers.get('authorization')
    const signature =
        request.headers.get('Content-Signature') ?? request.headers.get('content-signature')

    return paymentController.handleWebhook(rawBody, { authorization, signature })
}
