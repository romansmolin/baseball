import { describe, expect, it } from 'vitest'

import { LoggingReceiptMailer, SmtpReceiptMailer, buildReceiptEmail, createReceiptMailer } from '../receipt-email'

describe('buildReceiptEmail', () => {
    it('carries everything the card schemes require on a receipt', () => {
        const email = buildReceiptEmail({ to: 'a@b.c', transactionId: 'tx_123', amountCents: 800, currency: 'EUR', credits: 1200, paidAt: new Date('2026-11-04T10:30:00Z') })

        for (const part of ['€8.00', '1,200 credits', '2026-11-04 10:30 UTC', 'tx_123', 'CODERUSH SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ', 'https://www.mybaseballfantasy.com', '/legal/refunds']) {
            expect(email.text).toContain(part)
        }
        expect(email.html).toContain('/legal/refunds')
    })

    it('sends the receipt through the SMTP transport with the configured sender', async () => {
        const sent: unknown[] = []
        const mailer = new SmtpReceiptMailer({ sendMail: async (message) => { sent.push(message) } }, '"BaseballFantasy" <billing@mybaseballfantasy.com>')

        await mailer.send({ to: 'a@b.c', transactionId: 'tx_9', amountCents: 400, currency: 'EUR', credits: 500, paidAt: new Date('2026-11-04T10:30:00Z') })

        expect(sent).toHaveLength(1)
        expect(sent[0]).toMatchObject({ from: '"BaseballFantasy" <billing@mybaseballfantasy.com>', to: 'a@b.c' })
    })

    it('falls back to logging when SMTP is not configured', () => {
        expect(createReceiptMailer({})).toBeInstanceOf(LoggingReceiptMailer)
        expect(createReceiptMailer({ SMTP_HOST: 'smtp.example.com', SMTP_USER: 'u', SMTP_PASS: 'p' })).toBeInstanceOf(SmtpReceiptMailer)
    })
})
