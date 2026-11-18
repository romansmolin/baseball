import {
    Analytics01Icon,
    Award01Icon,
    BaseballBatIcon,
    BaseballIcon,
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
    { label: 'Players', href: '/players', icon: Analytics01Icon },
    { label: 'Games', href: '/games', icon: BaseballIcon },
    { label: 'Compare', href: '/compare', icon: Award01Icon },
    { label: 'My teams', href: '/teams', icon: BaseballBatIcon },
]
