'use client'

import Image from 'next/image'
import { useState } from 'react'

import { cn } from '@/shared/utils'

interface PlayerAvatarProps {
    name: string
    photoUrl: string | null
    color: string
    className?: string
}

const initials = (name: string) =>
    name
        .split(' ')
        .filter(Boolean)
        .map((word) => word[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()

const hexA = (hex: string, alpha: number) => {
    const value = Number.parseInt(hex.slice(1), 16)
    return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`
}

export const PlayerAvatar = ({ name, photoUrl, color, className }: PlayerAvatarProps) => {
    const [imageFailed, setImageFailed] = useState(false)

    return (
        <span
            className={cn(
                'relative flex shrink-0 items-center justify-center overflow-hidden font-anton',
                className,
            )}
            style={{ backgroundColor: hexA(color, 0.14), color }}
        >
            {photoUrl && !imageFailed ? (
                <Image
                    src={photoUrl}
                    alt={name}
                    fill
                    sizes="72px"
                    unoptimized
                    className="object-cover"
                    onError={() => setImageFailed(true)}
                />
            ) : (
                initials(name)
            )}
        </span>
    )
}
