import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

import type { AdminUserActivity } from '@/shared/admin'

const A4: [number, number] = [595.28, 841.89]
const MARGIN = 40
const ROW_H = 16
const BOTTOM = 50

type Column = { header: string; width: number; align?: 'right' }

// Helvetica's WinAnsi encoding can't draw most non-Latin characters; replace them
// rather than let pdf-lib throw on a user's name.
const safe = (value: string) => value.replace(/[^\x20-\x7E]/g, '?')

const formatMoney = (amountCents: number, currency: string) =>
    `${(amountCents / 100).toFixed(2)} ${currency}`

const formatDateTime = (iso: string) => iso.slice(0, 16).replace('T', ' ')

/** Renders a PDF of the stored activity for one user. Returns it base64-encoded. */
export async function renderUserReportPdf(activity: AdminUserActivity): Promise<string> {
    const doc = await PDFDocument.create()
    const regular = await doc.embedFont(StandardFonts.Helvetica)
    const bold = await doc.embedFont(StandardFonts.HelveticaBold)

    let page: PDFPage = doc.addPage(A4)
    let y = A4[1] - MARGIN

    const text = (value: string, x: number, at: number, size: number, font: PDFFont, align?: 'right') => {
        const content = safe(value)
        const width = font.widthOfTextAtSize(content, size)
        page.drawText(content, { x: align === 'right' ? x - width : x, y: at, size, font, color: rgb(0.1, 0.1, 0.1) })
    }

    const ensureSpace = (height: number) => {
        if (y - height >= BOTTOM) return false
        page = doc.addPage(A4)
        y = A4[1] - MARGIN
        return true
    }

    const table = (title: string, columns: Column[], rows: string[][]) => {
        ensureSpace(60)
        text(title, MARGIN, y, 13, bold)
        y -= 20
        if (rows.length === 0) {
            text('Nothing yet', MARGIN, y, 9, regular)
            y -= ROW_H + 10
            return
        }

        const drawRow = (cells: string[], font: PDFFont) => {
            let x = MARGIN
            columns.forEach((column, i) => {
                text(cells[i] ?? '', column.align === 'right' ? x + column.width - 6 : x, y, 9, font, column.align)
                x += column.width
            })
            y -= ROW_H
        }

        const header = columns.map((column) => column.header)
        drawRow(header, bold)
        for (const row of rows) {
            if (ensureSpace(ROW_H)) drawRow(header, bold)
            drawRow(row, regular)
        }
        y -= 14
    }

    const { user } = activity
    text('User report', MARGIN, y, 20, bold)
    y -= 26
    text(`${user.name} <${user.email}>`, MARGIN, y, 11, regular)
    y -= 16
    text(
        `Role ${user.role} | Status ${user.status} | Email ${user.emailVerified ? 'verified' : 'unverified'} | Joined ${formatDateTime(user.createdAt)}`,
        MARGIN,
        y,
        9,
        regular,
    )
    y -= 16
    text(`Credit balance: ${activity.balance}`, MARGIN, y, 11, bold)
    y -= 30

    table(
        'AI activity',
        [{ header: 'Started', width: 105 }, { header: 'Feature', width: 150 }, { header: 'Count', width: 60 }, { header: 'Completed', width: 80 }, { header: 'Credits', width: 80 }],
        activity.batches.map((batch) => [formatDateTime(batch.startedAt), batch.style, String(batch.count), String(batch.completed), String(batch.credits)]),
    )

    table(
        'Payments',
        [
            { header: 'Date', width: 105 },
            { header: 'Status', width: 90 },
            { header: 'Amount', width: 110, align: 'right' },
            { header: 'Credits', width: 80, align: 'right' },
            { header: 'Description', width: 130 },
        ],
        activity.payments.map((p) => [
            formatDateTime(p.createdAt),
            p.status,
            formatMoney(p.amountCents, p.currency),
            String(p.creditAmount),
            p.description,
        ]),
    )

    table(
        'Credit transactions',
        [
            { header: 'Date', width: 105 },
            { header: 'Type', width: 150 },
            { header: 'Status', width: 90 },
            { header: 'Amount', width: 70, align: 'right' },
            { header: 'Balance', width: 80, align: 'right' },
        ],
        activity.transactions.map((t) => [
            formatDateTime(t.createdAt),
            t.type,
            t.status,
            String(t.amount),
            String(t.balanceAfter),
        ]),
    )

    table(
        'Teams',
        [
            { header: 'Created', width: 105 },
            { header: 'Name', width: 210 },
            { header: 'League', width: 100 },
            { header: 'Format', width: 80 },
        ],
        activity.teams.map((t) => [formatDateTime(t.createdAt), t.name, t.leagueSlug, t.format]),
    )

    return Buffer.from(await doc.save()).toString('base64')
}
