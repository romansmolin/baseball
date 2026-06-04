'use client'

import {
    BookOpenCheckIcon,
    Logout02Icon,
    UserCircleIcon,
    Wallet02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Menu } from '@base-ui/react/menu'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { signOut } from '@/shared/lib/auth/auth-client'
import { cn } from '@/shared/utils'

interface UserMenuProps {
    initials: string
}

const LINKS = [
    { label: 'Wallet', href: '/wallet', icon: Wallet02Icon },
    { label: 'Profile', href: '/profile', icon: UserCircleIcon },
    { label: 'Rules', href: '/rules', icon: BookOpenCheckIcon },
] as const

export const UserMenu = ({ initials }: UserMenuProps) => {
    const router = useRouter()
    const [isSigningOut, setIsSigningOut] = useState(false)

    const handleSignOut = async () => {
        if (isSigningOut) return
        setIsSigningOut(true)
        try {
            await signOut()
            router.push('/auth/sign-in')
            router.refresh()
        } finally {
            setIsSigningOut(false)
        }
    }

    return (
        <Menu.Root>
            <Menu.Trigger
                aria-label="Open user menu"
                className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary outline-none transition-colors hover:bg-primary/25 focus-visible:ring-2 focus-visible:ring-ring/40"
            >
                {initials}
            </Menu.Trigger>
            <Menu.Portal>
                <Menu.Positioner
                    side="bottom"
                    align="end"
                    sideOffset={8}
                    className="z-50"
                >
                    <Menu.Popup
                        className={cn(
                            'min-w-48 overflow-hidden rounded-xl border border-foreground/10 bg-card p-1 shadow-2xl outline-none transition-all',
                            'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
                            'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
                        )}
                    >
                        {LINKS.map((link) => (
                            <Menu.LinkItem
                                key={link.href}
                                href={link.href}
                                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-muted"
                            >
                                <HugeiconsIcon
                                    icon={link.icon}
                                    className="size-4 text-muted-foreground"
                                />
                                {link.label}
                            </Menu.LinkItem>
                        ))}

                        <div className="my-1 h-px bg-foreground/10" />

                        <Menu.Item
                            disabled={isSigningOut}
                            onClick={handleSignOut}
                            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive outline-none transition-colors data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-destructive/10"
                        >
                            <HugeiconsIcon icon={Logout02Icon} className="size-4" />
                            {isSigningOut ? 'Signing out…' : 'Log out'}
                        </Menu.Item>
                    </Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    )
}
