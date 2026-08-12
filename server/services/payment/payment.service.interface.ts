// Exactly one field is set: `credits` for a pack, `amountCents` for a custom
// top-up. The schema enforces that before the service ever sees it.
export interface CreateCheckoutInput {
    credits?: number
    amountCents?: number
}

export interface IPaymentService {
    createCheckout(userId: string, input: CreateCheckoutInput): Promise<{ redirectUrl: string }>
    handleWebhook(
        rawBody: string,
        headers: { authorization: string | null; signature: string | null },
    ): Promise<void>
    reconcileReturn(token: string): Promise<{ status: 'SUCCESSFUL' | 'PENDING' | 'FAILED' }>
    getStatus(token: string): Promise<{
        status: string
        amountCents: number
        currency: string
        creditAmount: number
        updatedAt: string
    }>
}
