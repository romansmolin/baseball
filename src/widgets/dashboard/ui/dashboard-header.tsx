'use client'

import { BaseballIcon, Coins01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useCreditsData } from '@/entities/dashboard'
import { buttonVariants } from '@/shared/ui/button'
import { cn } from '@/shared/utils'
import { dashboardNav, type NavItem } from '../model/nav.const'
import { UserMenu } from './user-menu'

interface DashboardHeaderProps {
    initials: string
    showcaseEnabled?: boolean
}

export const DashboardHeader = ({ initials, showcaseEnabled = false }: DashboardHeaderProps) => {
    const pathname = usePathname()
    const { data: credits } = useCreditsData()
    const creditsLabel = (credits?.balance ?? 0).toLocaleString()
    const primaryNav: NavItem[] = showcaseEnabled ? [
        { ...dashboardNav[0], label: 'Home' },
        { label: 'Contests', href: '/contests', icon: BaseballIcon },
        dashboardNav.find(item => item.href === '/teams')!,
        { label: 'Managers', href: '/managers', icon: BaseballIcon },
    ] : dashboardNav
    const secondaryNav = dashboardNav.filter(item => !primaryNav.some(primary => primary.href === item.href))
    const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

    const renderNavLink = (item: NavItem, compact = false) => (
        <Link key={item.href} href={item.href} aria-label={compact ? item.label : undefined} aria-current={isActive(item.href) ? 'page' : undefined}
            className={cn('flex shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                compact ? 'min-h-9 gap-1 px-2.5 text-xs' : 'gap-1.5 px-3 py-1.5 text-sm',
                isActive(item.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
        >
                {!compact && <HugeiconsIcon icon={item.icon} className="size-4" />}{item.label}
        </Link>
    )

    const renderMoreMenu = (compact = false) => (
        <details className={cn('group/more relative shrink-0', compact && 'ml-auto')}>
            <summary aria-label="More sections" className={cn('flex cursor-pointer list-none items-center gap-1 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden',
                compact ? 'min-h-9 px-2.5 text-xs' : 'px-3 py-1.5 text-sm',
                secondaryNav.some(item => isActive(item.href)) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                More<ChevronDown className="size-3.5 transition-transform group-open/more:rotate-180" aria-hidden="true" />
            </summary>
            <ul className="absolute right-0 top-full z-30 mt-2 w-48 rounded-xl border border-foreground/10 bg-background p-1.5 shadow-lg">
                {secondaryNav.map(item => <li key={item.href}><Link href={item.href} aria-current={isActive(item.href) ? 'page' : undefined}
                    onClick={event => event.currentTarget.closest('details')?.removeAttribute('open')}
                    className={cn('flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring', isActive(item.href) ? 'text-primary' : 'text-muted-foreground')}>
                    <HugeiconsIcon icon={item.icon} className="size-4" />{item.label}
                </Link></li>)}
            </ul>
        </details>
    )

    return (
        <header className="sticky top-0 z-20 border-b border-foreground/10 bg-background/95 backdrop-blur">
            <div className={cn('mx-auto flex h-16 w-full items-center gap-3 px-5 md:gap-6 sm:px-8 lg:px-12', showcaseEnabled ? 'max-w-[1440px]' : 'max-w-7xl')}>
                <Link href="/dashboard" aria-label="BaseballFantasy dashboard" className="flex shrink-0 items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary"><HugeiconsIcon icon={BaseballIcon} className="size-4" /></span>
                    <span className="hidden font-anton text-lg tracking-wide min-[420px]:inline">Baseball<span className="text-primary">Fantasy</span></span>
                </Link>
                <nav aria-label="Main navigation" className={cn('min-w-0 flex-1 items-center gap-1', showcaseEnabled ? 'hidden xl:flex' : 'hidden overflow-x-auto md:flex')}>
                    {primaryNav.map(item => renderNavLink(item))}
                    {showcaseEnabled && renderMoreMenu()}
                </nav>
                <div className="ml-auto flex items-center gap-3">
                    <Link href="/wallet" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}>
                        <HugeiconsIcon icon={Coins01Icon} className="size-4 text-primary" /><span className="font-medium">{creditsLabel}</span><span className="text-xs text-muted-foreground">credits</span>
                    </Link>
                    <UserMenu initials={initials} />
                </div>
            </div>
            {showcaseEnabled && <nav aria-label="Mobile and tablet navigation" className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-0.5 border-t border-foreground/10 px-2.5 py-1 sm:gap-2 sm:px-5 xl:hidden">
                {primaryNav.map(item => renderNavLink(item, true))}{renderMoreMenu(true)}
            </nav>}
        </header>
    )
}
