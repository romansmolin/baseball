import nodemailer from 'nodemailer'

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

interface MailTransport {
    sendMail(message: { from: string; to: string; subject: string; text: string; html: string }): Promise<unknown>
}

/** Sends receipts over SMTP. */
export class SmtpReceiptMailer implements IReceiptMailer {
    private readonly transport: MailTransport
    private readonly from: string

    constructor(transport: MailTransport, from: string) {
        this.transport = transport
        this.from = from
    }

    async send(receipt: PaymentReceipt): Promise<void> {
        const email = buildReceiptEmail(receipt)
        await this.transport.sendMail({ from: this.from, to: receipt.to, subject: email.subject, text: email.text, html: email.html })
    }
}

/** Without SMTP settings a receipt is logged, never lost silently and never blocks a payment. */
export class LoggingReceiptMailer implements IReceiptMailer {
    async send(receipt: PaymentReceipt): Promise<void> {
        console.warn(`[receipt] SMTP is not configured; receipt ${receipt.transactionId} was not emailed`)
    }
}

/** Uses SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, EMAIL_FROM and EMAIL_FROM_NAME. */
export function createReceiptMailer(env: Record<string, string | undefined> = process.env): IReceiptMailer {
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return new LoggingReceiptMailer()

    const transport = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT ?? '465'),
        secure: (env.SMTP_SECURE ?? 'true') === 'true',
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
    const fromName = (env.EMAIL_FROM_NAME ?? COMPANY.siteName).replace(/["\r\n]/g, '')
    return new SmtpReceiptMailer(transport, `"${fromName}" <${env.EMAIL_FROM ?? env.SMTP_USER}>`)
}
