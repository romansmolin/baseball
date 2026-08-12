import { ProfileCard, SecurityCard } from '@/widgets/profile'

interface ProfileViewProps {
    name: string
    email: string
    emailVerified: boolean
    memberSince: Date
    avatarUrl: string | null
    hasPassword: boolean
}

const initialsOf = (name: string): string => {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const ProfileView = ({
    name,
    email,
    emailVerified,
    memberSince,
    avatarUrl,
    hasPassword,
}: ProfileViewProps) => (
    <main className="container mx-auto max-w-4xl space-y-6 px-6 py-8">
        <div>
            <h1 className="font-anton text-3xl tracking-wide">Profile</h1>
            <p className="mt-1 text-sm text-muted-foreground">
                Your account at a glance.
            </p>
        </div>
        <ProfileCard
            name={name || email.split('@')[0]}
            email={email}
            initials={initialsOf(name || email)}
            emailVerified={emailVerified}
            memberSince={memberSince}
            avatarUrl={avatarUrl}
        />
        <SecurityCard hasPassword={hasPassword} />
    </main>
)
