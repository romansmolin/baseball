import {
    BaseballBatIcon,
    Crown02Icon,
    GameController01Icon,
    HomeIcon,
    UserCircleIcon,
} from '@hugeicons/core-free-icons'

export interface NavItem {
    label: string
    href: string
    icon: typeof HomeIcon
}

export const dashboardNav: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { label: 'Contests', href: '/contests', icon: GameController01Icon },
    { label: 'My teams', href: '/teams', icon: BaseballBatIcon },
    { label: 'Leagues', href: '/leagues', icon: Crown02Icon },
    { label: 'Players', href: '/players', icon: UserCircleIcon },
]
