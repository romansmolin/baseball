'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/shared/utils'

const TABS = [
    { label: 'Leaders', href: '/stats' },
    { label: 'Scores', href: '/games' },
    { label: 'Players', href: '/players' },
]

/** Title and tabs shared by the three stats pages. */
export function StatsNav({ className }: { className?: string }) {
    const pathname = usePathname()

    return (
        <div className={cn('mx-auto w-full px-6 pt-8', className)}>
            <h1 className="font-anton text-5xl uppercase leading-none">Stats</h1>
            <p className="mt-3 max-w-prose text-sm text-muted-foreground">
                Every fantasy point is counted from the official box score of a real game. See who scored, what happened on the field, and who to pick.
            </p>
            <nav aria-label="Stats sections" className="mt-5 flex gap-6 border-b border-border">
                {TABS.map((tab) => {
                    const active = pathname === tab.href
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                '-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                                active ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {tab.label}
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
