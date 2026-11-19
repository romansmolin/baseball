import axios from 'axios'
const apiClient = axios.create()
import type { DemoActivityRow, DemoPaymentRow } from '../../../model/demo-data'

export type DemoReportRequest = {
    email: string
    period: string
    activity: DemoActivityRow[] | null
    payments: DemoPaymentRow[] | null
}

type DemoReportStatus = {
    status: 'processing' | 'completed' | 'failed'
    error: string | null
    file: { contentType: string; base64: string } | null
}

const POLL_INTERVAL_MS = 1000
const MAX_POLLS = 60

const wait = (ms: number, signal: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, ms)
        signal.addEventListener('abort', () => {
            clearTimeout(timer)
            reject(new DOMException('Aborted', 'AbortError'))
        })
    })

/** Starts the server-side render and polls until the PDF is ready. Resolves with its base64. */
export async function generateDemoReport(request: DemoReportRequest, signal: AbortSignal): Promise<string> {
    const { id } = (await apiClient.post<{ id: string }>('/api/admin/demo-report', request, { signal })).data

    for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        await wait(POLL_INTERVAL_MS, signal)
        const { data } = await apiClient.get<DemoReportStatus>(`/api/admin/demo-report/${id}`, { signal })

        if (data.status === 'completed' && data.file) return data.file.base64
        if (data.status === 'failed') throw new Error(data.error ?? 'Could not generate the report')
    }
    throw new Error('Report is taking too long, try again')
}
