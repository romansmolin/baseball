import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/shared/lib/auth'
import { DashboardView } from '@/views/dashboard/dashboard-view'

export default async function DashboardPage() {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session) {
        redirect('/auth/sign-in')
    }

    return <DashboardView session={session} />
}
