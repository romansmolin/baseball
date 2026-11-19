import { expect, it } from 'vitest'
import { POST } from './route'

it('returns a PDF for valid receipt details and rejects invalid dates', async () => {
    const data = { receiptId: 'abc', email: 'test@example.com', date: '04.03.2026', tokens: 1200, description: 'Credits purchase', amount: 800, currency: 'EUR' }
    const request = (body: unknown) => new Request('http://localhost/api/generate-receipt', { method: 'POST', body: JSON.stringify(body) })
    const response = await POST(request(data))
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')
    expect(Buffer.from(await response.arrayBuffer()).subarray(0, 4).toString()).toBe('%PDF')
    expect((await POST(request({ ...data, date: '31.02.2026' }))).status).toBe(400)
})
