import { PlusSignIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

interface MyTeamsHeaderProps {
    totalTeams: number
    totalLeagues: number
}

export const MyTeamsHeader = ({ totalTeams, totalLeagues }: MyTeamsHeaderProps) => (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
            <h1 className="font-anton text-3xl tracking-wide">My teams</h1>
            <p className="mt-1 text-sm text-muted-foreground">
                Every lineup you've built and saved —{' '}
                <span className="font-medium text-foreground">{totalTeams}</span> teams across{' '}
                <span className="font-medium text-foreground">{totalLeagues}</span> leagues.
            </p>
        </div>
        <Link
            href="/teams/new"
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:brightness-95"
        >
            <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
            Build a team
        </Link>
    </div>
)
