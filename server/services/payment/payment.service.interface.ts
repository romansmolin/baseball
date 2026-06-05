export interface IPaymentService {
    createCheckout(userId: string, credits: number): Promise<{ redirectUrl: string }>
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
