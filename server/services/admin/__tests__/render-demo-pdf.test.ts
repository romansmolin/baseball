import { PDFDocument, PDFPage } from 'pdf-lib'
import { expect, it, vi } from 'vitest'
import { renderDemoReportPdf } from '../render-demo-pdf'

it('renders multi-page demo reports with BaseballFantasy colours and repeated table headers', async () => {
    const drawText = vi.spyOn(PDFPage.prototype, 'drawText')
    const rectangles = vi.spyOn(PDFPage.prototype, 'drawRectangle')
    try {
        const activity = Array.from({ length: 70 }, (_, i) => ({ index: i + 1, date: '2026-01-01', time: '12:00', type: 'Game analysis', tokens: 300, amountCents: 300, currency: 'EUR', status: 'Successful' as const, totalSpent: 21000 }))
        const pdf = await PDFDocument.load(Buffer.from(await renderDemoReportPdf({ email: 'demo@example.com', period: '2026-01-01 - 2026-01-31', activity, payments: null }), 'base64'))
        expect(pdf.getPageCount()).toBeGreaterThan(1)
        expect(drawText.mock.calls.filter(([text]) => text === 'Date').length).toBeGreaterThan(1)
        expect(rectangles.mock.calls.some(([options]) => options?.color?.type === 'RGB' && Math.abs(options.color.red - 18 / 255) < 0.001 && Math.abs(options.color.green - 53 / 255) < 0.001)).toBe(true)
    } finally { drawText.mockRestore(); rectangles.mockRestore() }
})
