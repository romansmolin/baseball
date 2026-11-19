import { z } from 'zod'
import { ApiError } from '../../../../server/errors/api.error'
import { renderReceipt } from '../../../../server/services/admin/receipt'

const schema = z.object({
    receiptId: z.string().trim().min(1).max(80), email: z.string().trim().email().max(80),
    date: z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/).refine((value) => {
        const [day, month, year] = value.split('.').map(Number)
        const date = new Date(Date.UTC(year, month - 1, day))
        return year >= 100 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    }),
    tokens: z.number().finite().positive(), description: z.string().trim().min(1).max(100),
    amount: z.number().int().nonnegative().safe(), currency: z.string().regex(/^[A-Z]{3}$/),
})

export async function POST(request: Request) {
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return ApiError.validationError('Invalid receipt data').toResponse()
    const { receiptId, email, date, tokens, description, amount, currency } = parsed.data
    const base64 = await renderReceipt({ receiptId, email, date, credits: tokens, description, amountCents: amount, currency })
    return new Response(Buffer.from(base64, 'base64'), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="receipt.pdf"', 'Cache-Control': 'no-store' } })
}
