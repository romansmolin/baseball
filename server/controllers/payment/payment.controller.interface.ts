export interface IPaymentController {
    createCheckout(body: unknown, userId: string): Promise<Response>
    handleWebhook(
        rawBody: string,
        headers: { authorization: string | null; signature: string | null },
    ): Promise<Response>
    handleReturn(token: string | null): Promise<Response>
    getStatus(token: string): Promise<Response>
}
