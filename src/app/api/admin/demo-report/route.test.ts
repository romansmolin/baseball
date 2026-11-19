import { beforeEach, expect, it, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), after: vi.fn() }))
vi.mock('next/server', () => ({ after: mocks.after }))
vi.mock('../../../../../server/shared/auth.utils', () => ({ getAuthenticatedUser: async () => ({ id: 'user-1' }) }))
vi.mock('../../../../../server/lib/prisma', () => ({ prisma: { demoReportJob: { create: mocks.create, update: mocks.update } } }))
import { POST } from './route'

beforeEach(() => { vi.clearAllMocks(); mocks.create.mockResolvedValue({ id: 'job-1' }); mocks.update.mockResolvedValue({}) })

it('creates a job and renders a valid PDF from the submitted activity', async () => {
    const body = { email: 'user@example.com', period: '2026-01-01 - 2026-01-31', activity: [{ index: 1, date: '2026-01-01', time: '12:00', type: 'Game analysis', tokens: 300, amountCents: 300, currency: 'EUR', status: 'Successful', totalSpent: 300 }], payments: null }
    const response = await POST(new Request('http://localhost/api/admin/demo-report', { method: 'POST', body: JSON.stringify(body) }))
    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ id: 'job-1' })
    await mocks.after.mock.calls[0][0]()
    const saved = mocks.update.mock.calls[0][0].data
    expect(saved.status).toBe('completed')
    expect((await PDFDocument.load(Buffer.from(saved.fileBase64, 'base64'))).getPageCount()).toBeGreaterThan(0)
})
