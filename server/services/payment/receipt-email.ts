import { COMPANY } from '@/shared/company'

export interface PaymentReceipt {
    to: string
    /** Our unique transaction ID. */
    transactionId: string
    amountCents: number
    currency: string
    credits: number
    paidAt: Date
}

export interface IReceiptMailer {
    send(receipt: PaymentReceipt): Promise<void>
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

/** The receipt card schemes expect: amount and currency, merchant name and URL, date, unique ID, refund policy link. */
export function buildReceiptEmail(receipt: PaymentReceipt): { subject: string; text: string; html: string } {
    const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: receipt.currency }).format(receipt.amountCents / 100)
    const date = receipt.paidAt.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
    const refundUrl = `${COMPANY.siteUrl}/legal/refunds`
    const lines = [
        ['Amount paid', amount],
        ['Credits added', `${receipt.credits.toLocaleString('en-US')} credits`],
        ['Date', date],
        ['Transaction ID', receipt.transactionId],
        ['Merchant', `${COMPANY.legalName}, ${COMPANY.address}`],
        ['Website', COMPANY.siteUrl],
    ] as const

    const text = [
        `Thank you for your purchase on ${COMPANY.siteName}.`,
        '',
        ...lines.map(([label, value]) => `${label}: ${value}`),
        '',
        `Refund & Return Policy: ${refundUrl}`,
        `Questions? ${COMPANY.billingEmail}`,
    ].join('\n')

    const rows = lines.map(([label, value]) => `<tr><td style="padding:6px 16px 6px 0;color:#556259">${escapeHtml(label)}</td><td style="padding:6px 0"><strong>${escapeHtml(value)}</strong></td></tr>`).join('')
    const html = `<div style="font-family:Arial,sans-serif;color:#15211a;max-width:520px"><h1 style="font-size:20px">Thank you for your purchase</h1><p>Your credits have been added to your ${escapeHtml(COMPANY.siteName)} account.</p><table style="border-collapse:collapse;font-size:14px">${rows}</table><p style="margin-top:20px"><a href="${refundUrl}">Refund &amp; Return Policy</a></p><p style="font-size:12px;color:#556259">Questions? ${escapeHtml(COMPANY.billingEmail)}</p></div>`

    return { subject: `Your receipt from ${COMPANY.siteName}: ${amount}`, text, html }
}

/** Sends receipts through the Resend HTTP API; needs RESEND_API_KEY and RECEIPT_FROM_EMAIL. */
export class ResendReceiptMailer implements IReceiptMailer {
    private readonly apiKey: string
    private readonly from: string

    constructor(apiKey: string, from: string) {
        this.apiKey = apiKey
        this.from = from
    }

    async send(receipt: PaymentReceipt): Promise<void> {
        const email = buildReceiptEmail(receipt)
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
            body: JSON.stringify({ from: this.from, to: [receipt.to], subject: email.subject, text: email.text, html: email.html }),
            signal: AbortSignal.timeout(8000),
        })
        if (!response.ok) throw new Error(`Receipt email failed: HTTP ${response.status}`)
    }
}

/** Without a configured mail service a receipt is logged, never lost silently and never blocks a payment. */
export class LoggingReceiptMailer implements IReceiptMailer {
    async send(receipt: PaymentReceipt): Promise<void> {
        console.warn(`[receipt] RESEND_API_KEY is not set; receipt ${receipt.transactionId} was not emailed`)
    }
}

export function createReceiptMailer(env: Record<string, string | undefined> = process.env): IReceiptMailer {
    const apiKey = env.RESEND_API_KEY
    const from = env.RECEIPT_FROM_EMAIL ?? `${COMPANY.siteName} <${COMPANY.billingEmail}>`
    return apiKey ? new ResendReceiptMailer(apiKey, from) : new LoggingReceiptMailer()
}
