import {
    Calendar02Icon,
    Mail01Icon,
    Tick02Icon,
    UserCircleIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { cn } from '@/shared/utils'

interface ProfileCardProps {
    name: string
    email: string
    initials: string
    emailVerified: boolean
    memberSince: Date
    avatarUrl: string | null
}

const formatMemberSince = (date: Date): string =>
    new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
    }).format(date)

export const ProfileCard = ({
    name,
    email,
    initials,
    emailVerified,
    memberSince,
    avatarUrl,
}: ProfileCardProps) => (
    <section className="overflow-hidden rounded-3xl border border-foreground/10 bg-card">
        <div className="relative h-28 bg-linear-to-r from-primary/30 via-primary/15 to-transparent">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_50%,oklch(from_var(--color-primary)_l_c_h_/_0.25),transparent_55%)]"
            />
        </div>

        <div className="-mt-12 flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end">
            {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={avatarUrl}
                    alt={name}
                    className="size-24 rounded-2xl border-4 border-card object-cover"
                />
            ) : (
                <span className="flex size-24 items-center justify-center rounded-2xl border-4 border-card bg-primary/15 font-anton text-3xl text-primary">
                    {initials}
                </span>
            )}

            <div className="flex-1 sm:pb-1">
                <h1 className="font-anton text-3xl tracking-wide">{name}</h1>
                <p className="text-sm text-muted-foreground">@{email.split('@')[0]}</p>
            </div>
        </div>

        <div className="grid gap-px bg-foreground/5 sm:grid-cols-3">
            <InfoTile
                icon={Mail01Icon}
                label="Email"
                value={email}
                trailing={
                    emailVerified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                            <HugeiconsIcon icon={Tick02Icon} className="size-3" />
                            Verified
                        </span>
                    ) : (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                            Unverified
                        </span>
                    )
                }
            />
            <InfoTile
                icon={UserCircleIcon}
                label="Display name"
                value={name}
            />
            <InfoTile
                icon={Calendar02Icon}
                label="Member since"
                value={formatMemberSince(memberSince)}
            />
        </div>
    </section>
)

interface InfoTileProps {
    icon: typeof Mail01Icon
    label: string
    value: string
    trailing?: React.ReactNode
}

const InfoTile = ({ icon, label, value, trailing }: InfoTileProps) => (
    <div className={cn('flex items-center gap-3 bg-card px-6 py-4')}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground/5 text-muted-foreground">
            <HugeiconsIcon icon={icon} className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="truncate text-sm font-medium">{value}</div>
        </div>
        {trailing}
    </div>
)
