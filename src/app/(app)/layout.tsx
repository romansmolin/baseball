import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'

import { BuyCreditsProvider } from '@/features/buy-credits'
import { auth } from '@/shared/lib/auth'
import { DashboardHeader } from '@/widgets/dashboard'

const getInitials = (name: string) =>
    name
        .split(' ')
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session) {
        redirect('/auth/sign-in')
    }

    return (
        <BuyCreditsProvider>
            <div className="flex min-h-svh flex-col">
                <DashboardHeader initials={getInitials(session.user.name)} />
                <main className="flex-1">{children}</main>
                <Toaster richColors position="top-right" />
            </div>
        </BuyCreditsProvider>
    )
}
