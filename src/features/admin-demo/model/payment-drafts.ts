export const PAYMENT_STATUSES = ['Successful', 'Pending', 'Failed', 'Declined', 'Expired', 'Cancelled', 'Error', 'Created'] as const

export type PaymentDraft = { id: string; date: string; amount: string; currency: string; tokens: string; status: string }

export function createPaymentDrafts(count: number, date: string, createId: () => string): PaymentDraft[] {
    // Default to the 1,200-credit pack (€8); values remain editable.
    return Array.from({ length: count }, () => ({
        id: createId(), date, amount: '8.00', currency: 'EUR', tokens: '1200', status: 'Successful',
    }))
}
