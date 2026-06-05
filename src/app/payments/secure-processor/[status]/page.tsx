import { PaymentStatusView } from '@/views/payment-status'

export const dynamic = 'force-dynamic'

type DisplayStatus = 'success' | 'pending' | 'failed'

const toStatus = (raw: string | undefined): DisplayStatus =>
    raw === 'success' || raw === 'pending' ? raw : 'failed'

const firstParam = (value: string | string[] | undefined): string | null => {
    if (Array.isArray(value)) return value[0] ?? null
    return value ?? null
}

export default async function PaymentStatusPage({
    params,
    searchParams,
}: {
    params: Promise<{ status: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const { status } = await params
    const resolvedSearch = await searchParams
    const token = firstParam(resolvedSearch.token)

    return <PaymentStatusView initialStatus={toStatus(status)} token={token} />
}
