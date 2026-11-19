import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { DemoActivityRow, DemoPaymentRow } from '@/features/admin-demo/model/demo-data'

export type DemoReportInput = {
    email: string
    period: string
    activity: DemoActivityRow[] | null
    payments: DemoPaymentRow[] | null
}

type Column = { header: string; width: number; align?: 'right' }

// Light theme colours from src/app/globals.css.
const BOARD = rgb(18 / 255, 53 / 255, 36 / 255)
const LAMP = rgb(1, 196 / 255, 77 / 255)
const SURFACE = rgb(248 / 255, 249 / 255, 245 / 255)
const MUTED_SURFACE = rgb(237 / 255, 240 / 255, 233 / 255)
const BORDER = rgb(203 / 255, 211 / 255, 198 / 255)
const TEXT = rgb(21 / 255, 33 / 255, 26 / 255)
const MUTED = rgb(85 / 255, 98 / 255, 89 / 255)
const WHITE = rgb(1, 1, 1)

const A4: [number, number] = [595.28, 841.89]
const MARGIN = 40
const HEADER_H = 112
const FOOTER_H = 40
const ROW_H = 22
const CONTENT_W = A4[0] - MARGIN * 2

const money = (cents: number, currency: string) => `${currency} ${(cents / 100).toFixed(2)}`

export async function renderDemoReportPdf(input: DemoReportInput): Promise<string> {
    const pdf = await PDFDocument.create()
    const regular = await pdf.embedFont(StandardFonts.Helvetica)
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

    let page!: PDFPage
    let y = 0

    const text = (
        value: string,
        x: number,
        at: number,
        size: number,
        font: PDFFont,
        color = TEXT,
        align?: 'right',
        maxWidth?: number,
    ) => {
        const safe = value.replace(/[^\x20-\x7E]/g, '?')
        const naturalWidth = font.widthOfTextAtSize(safe, size)
        const fittedSize =
            maxWidth && naturalWidth > maxWidth ? (size * maxWidth) / naturalWidth : size
        const left = align === 'right' ? x - font.widthOfTextAtSize(safe, fittedSize) : x
        page.drawText(safe, { x: left, y: at, size: fittedSize, font, color })
    }

    const newPage = () => {
        page = pdf.addPage(A4)
        page.drawRectangle({
            x: 0,
            y: A4[1] - HEADER_H,
            width: A4[0],
            height: HEADER_H,
            color: BOARD,
        })
        text('BASEBALL', MARGIN, A4[1] - 34, 18, bold, WHITE)
        const brandWidth = bold.widthOfTextAtSize('BASEBALL', 18)
        text('FANTASY', MARGIN + brandWidth + 3, A4[1] - 34, 18, bold, LAMP)
        text('ACTIVITY REPORT', MARGIN, A4[1] - 58, 11, bold, WHITE)
        text(input.email, MARGIN, A4[1] - 82, 9, regular, WHITE, undefined, CONTENT_W * 0.57)
        text(input.period, A4[0] - MARGIN, A4[1] - 82, 9, regular, LAMP, 'right', CONTENT_W * 0.4)
        page.drawRectangle({ x: 0, y: 0, width: A4[0], height: FOOTER_H - 8, color: MUTED_SURFACE })
        text('BASEBALLFANTASY  /  DEMO DATA', MARGIN, 12, 8, bold, MUTED)
        text(`Page ${pdf.getPageCount()}`, A4[0] - MARGIN, 12, 8, regular, MUTED, 'right')
        y = A4[1] - HEADER_H - 30
    }

    const ensureSpace = (height: number) => {
        if (y - height < FOOTER_H + 10) newPage()
    }

    const section = (title: string, stats: [string, string][]) => {
        ensureSpace(90)
        text(title, MARGIN, y, 14, bold, BOARD)
        y -= 14
        const cardW = (CONTENT_W - 12 * (stats.length - 1)) / stats.length
        stats.forEach(([label, value], i) => {
            const x = MARGIN + i * (cardW + 12)
            page.drawRectangle({
                x,
                y: y - 44,
                width: cardW,
                height: 44,
                color: SURFACE,
                borderColor: BORDER,
                borderWidth: 1,
            })
            text(label.toUpperCase(), x + 10, y - 16, 8, bold, MUTED, undefined, cardW - 20)
            text(value, x + 10, y - 35, 14, bold, BOARD, undefined, cardW - 20)
        })
        y -= 62
    }

    const table = (columns: Column[], rows: string[][]) => {
        const header = () => {
            page.drawRectangle({
                x: MARGIN,
                y: y - 6,
                width: CONTENT_W,
                height: ROW_H,
                color: BOARD,
            })
            let x = MARGIN
            for (const column of columns) {
                const edge = column.align === 'right' ? x + column.width - 8 : x + 8
                text(column.header, edge, y, 8, bold, WHITE, column.align, column.width - 14)
                x += column.width
            }
            y -= ROW_H
        }

        ensureSpace(ROW_H * 3)
        header()
        rows.forEach((row, i) => {
            if (y - ROW_H < FOOTER_H + 10) {
                newPage()
                header()
            }
            if (i % 2 === 0)
                page.drawRectangle({
                    x: MARGIN,
                    y: y - 6,
                    width: CONTENT_W,
                    height: ROW_H,
                    color: MUTED_SURFACE,
                })
            let x = MARGIN
            row.forEach((cell, c) => {
                const column = columns[c]
                const edge = column.align === 'right' ? x + column.width - 8 : x + 8
                text(cell, edge, y, 9, regular, TEXT, column.align, column.width - 14)
                x += column.width
            })
            y -= ROW_H
        })
        y -= 18
    }

    newPage()

    if (input.activity) {
        const total = input.activity[0]?.totalSpent ?? 0
        section('Generation activity', [
            ['Generations', String(input.activity.length)],
            ['Tokens spent', String(total)],
            ['Period', input.period],
        ])
        table(
            [
                { header: '#', width: 30 },
                { header: 'Date', width: 73 },
                { header: 'Time', width: 44 },
                { header: 'Type', width: 143 },
                { header: 'Tokens', width: 53, align: 'right' },
                { header: 'Status', width: 76, align: 'right' },
                { header: 'Total spent', width: 96, align: 'right' },
            ],
            input.activity.map((r) => [
                String(r.index),
                r.date,
                r.time,
                r.type,
                String(r.tokens),
                r.status,
                String(r.totalSpent),
            ]),
        )
    }

    if (input.payments) {
        const currencies = new Set(input.payments.map((row) => row.currency))
        const stats: [string, string][] = [
            ['Payments', String(input.payments.length)],
            ['Tokens', String(input.payments.reduce((sum, r) => sum + r.tokens, 0))],
        ]
        if (currencies.size === 1) {
            stats.push([
                'Total',
                money(
                    input.payments.reduce((sum, row) => sum + row.amountCents, 0),
                    input.payments[0].currency,
                ),
            ])
        }
        section('Payment history', stats)
        table(
            [
                { header: 'ID', width: 175 },
                { header: 'Date', width: 72 },
                { header: 'Amount', width: 60, align: 'right' },
                { header: 'Currency', width: 60, align: 'right' },
                { header: 'Tokens', width: 60, align: 'right' },
                { header: 'Status', width: 88, align: 'right' },
            ],
            input.payments.map((r) => [
                r.id,
                r.date,
                (r.amountCents / 100).toFixed(2),
                r.currency,
                String(r.tokens),
                r.status,
            ]),
        )
    }

    return pdf.saveAsBase64()
}
