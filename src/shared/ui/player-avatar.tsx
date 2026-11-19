import Image from 'next/image'

import { cn } from '../utils'

interface PlayerAvatarProps {
    playerId: number
    name: string
    className?: string
}

// MLB serves headshots by player id and falls back to a generic silhouette for unknown ids.
const headshotUrl = (playerId: number) =>
    `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_160,q_auto:best/v1/people/${playerId}/headshot/67/current`

const initials = (name: string) =>
    name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()

export function PlayerAvatar({ playerId, name, className }: PlayerAvatarProps) {
    return (
        <span
            className={cn(
                'relative inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-muted-foreground',
                className,
            )}
        >
            {initials(name)}
            <Image
                src={headshotUrl(playerId)}
                alt={name}
                width={160}
                height={160}
                unoptimized
                className="absolute inset-0 size-full object-cover object-top"
                onError={(e) => {
                    e.currentTarget.style.display = 'none'
                }}
            />
        </span>
    )
}
