import { headers } from 'next/headers'

import { auth } from '@/shared/lib/auth'
import { DashboardView } from '@/views/dashboard/dashboard-view'

interface DashboardPageProps {
    searchParams: Promise<{ view?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
    const session = await auth.api.getSession({ headers: await headers() })
    const { view } = await searchParams
    const dashboardView = view === 'new' ? 'new' : 'returning'

    return <DashboardView userName={session?.user.name ?? ''} view={dashboardView} />
}
