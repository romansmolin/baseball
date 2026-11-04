import {
    Analytics01Icon,
    Award01Icon,
    BaseballBatIcon,
    Crown02Icon,
    HomeIcon,
} from '@hugeicons/core-free-icons'

export interface NavItem {
    label: string
    href: string
    icon: typeof HomeIcon
    /** Other paths that belong to this section, so it stays highlighted on them. */
    matches?: string[]
}

export const dashboardNav: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { label: 'Contests', href: '/contests', icon: Award01Icon },
    { label: 'My teams', href: '/teams', icon: BaseballBatIcon },
    { label: 'Leagues', href: '/leagues', icon: Crown02Icon },
    { label: 'Stats', href: '/stats', icon: Analytics01Icon, matches: ['/games', '/players'] },
]
