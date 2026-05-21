import { BaseballIcon, Coins01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/utils'

import { dashboardNav } from '../model/nav.const'

interface DashboardHeaderProps {
    initials: string
    creditsLabel: string
    activeHref?: string
}

export const DashboardHeader = ({
    initials,
    creditsLabel,
    activeHref = '/dashboard',
}: DashboardHeaderProps) => (
    <header className="sticky top-0 z-20 border-b border-foreground/10 bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
            <Link href="/dashboard" className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <HugeiconsIcon icon={BaseballIcon} className="size-4" />
                </span>
                <span className="font-anton text-lg tracking-wide">
                    Baseball<span className="text-primary">Fantasy</span>
                </span>
            </Link>

            <nav className="hidden flex-1 items-center gap-1 md:flex">
                {dashboardNav.map((item) => {
                    const isActive = item.href === activeHref
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors',
                                isActive
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                        >
                            <HugeiconsIcon icon={item.icon} className="size-4" />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            <div className="ml-auto flex items-center gap-3">
                <Button variant="outline" size="sm" className="gap-2">
                    <HugeiconsIcon icon={Coins01Icon} className="size-4 text-primary" />
                    <span className="font-medium">{creditsLabel}</span>
                    <span className="text-xs text-muted-foreground">credits</span>
                </Button>
                <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {initials}
                </span>
            </div>
        </div>
    </header>
)
