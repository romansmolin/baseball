import { createHash } from 'node:crypto'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { COMPANY } from '@/shared/company/company.const'
import { ApiError } from '../../errors/api.error'
import { ErrorCode } from '../../errors/error-code.enum'

type Purchase = { id: string; status: string; amountCents: number; currency: string; creditAmount: number; createdAt: Date; user: { email: string } }
type Transaction = { status: string; amount: number } | null

export function buildReceipt(payment: Purchase, transaction: Transaction) {
    if (payment.status !== 'SUCCESSFUL' || !transaction || transaction.status !== 'COMPLETED' || transaction.amount !== payment.creditAmount) {
        throw ApiError.conflict(ErrorCode.VALIDATION_ERROR, 'Receipts are available only for successful purchases')
    }
    return { receiptId: createHash('sha256').update(payment.id).digest('hex').slice(0, 12), email: payment.user.email, date: payment.createdAt.toISOString().slice(0, 10), credits: transaction.amount, description: `Credits purchase (${transaction.amount} credits)`, amountCents: payment.amountCents, currency: payment.currency }
}

export async function renderReceipt(receipt: ReturnType<typeof buildReceipt>): Promise<string> {
    const pdf = await PDFDocument.create()
    const page = pdf.addPage([595, 842])
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const lines = [COMPANY.siteName, 'Receipt', `Receipt number: ${receipt.receiptId}`, `Date: ${receipt.date}`, `Customer: ${receipt.email}`, receipt.description, `Credits: ${receipt.credits}`, `Total: ${(receipt.amountCents / 100).toFixed(2)} ${receipt.currency}`, COMPANY.legalName, COMPANY.address, COMPANY.siteUrl, `${COMPANY.siteUrl}/legal/refunds`]
    lines.forEach((line, i) => page.drawText(line.replace(/[^\x20-\x7e]/g, '?'), { x: 40, y: 790 - i * 35, size: i === 1 ? 20 : 11, font }))
    return pdf.saveAsBase64()
}
