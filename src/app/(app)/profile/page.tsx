import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/shared/lib/auth'
import { ProfileView } from '@/views/profile/profile-view'

import { prisma } from '../../../../server/lib/prisma'

export default async function ProfilePage() {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) redirect('/auth/sign-in')

    // Pull the createdAt directly — better-auth's session payload doesn't
    // include it, and we want the "Member since" tile to render server-side
    // so the page is paint-stable without a SWR roundtrip.
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true, emailVerified: true, image: true, createdAt: true },
    })
    if (!user) redirect('/auth/sign-in')

    return (
        <ProfileView
            name={user.name}
            email={user.email}
            emailVerified={user.emailVerified}
            memberSince={user.createdAt}
            avatarUrl={user.image}
        />
    )
}
