import Image from 'next/image'

import { cn } from '../utils'

interface TeamLogoProps {
    teamId: number
    /** Short text shown when the logo is missing, e.g. the team abbreviation. */
    label: string
    className?: string
}

// The sports API does not return logos; MLB serves them by team id.
const logoUrl = (teamId: number) => `https://www.mlbstatic.com/team-logos/${teamId}.svg`

export function TeamLogo({ teamId, label, className }: TeamLogoProps) {
    return (
        <span
            className={cn(
                'relative inline-flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[9px] font-bold text-muted-foreground',
                className,
            )}
        >
            {label.slice(0, 3).toUpperCase()}
            <Image
                src={logoUrl(teamId)}
                alt=""
                width={64}
                height={64}
                unoptimized
                className="absolute inset-0 size-full rounded-full bg-white object-contain p-[12%]"
                onError={(e) => {
                    e.currentTarget.style.display = 'none'
                }}
            />
        </span>
    )
}
