import { headers } from 'next/headers'

import { auth } from '@/shared/lib/auth'

export interface AuthenticatedUser {
    id: string
    email: string
    name: string
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user?.id) return null

    return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
    }
}
