import {
    Award01Icon,
    BaseballBatIcon,
    Crown02Icon,
    HomeIcon,
    LiveStreaming01Icon,
    UserCircleIcon,
} from '@hugeicons/core-free-icons'

export interface NavItem {
    label: string
    href: string
    icon: typeof HomeIcon
}

export const dashboardNav: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { label: 'Tournaments', href: '/tournaments', icon: Award01Icon },
    { label: 'Games', href: '/games', icon: LiveStreaming01Icon },
    { label: 'My teams', href: '/teams', icon: BaseballBatIcon },
    { label: 'Leagues', href: '/leagues', icon: Crown02Icon },
    { label: 'Players', href: '/players', icon: UserCircleIcon },
]
