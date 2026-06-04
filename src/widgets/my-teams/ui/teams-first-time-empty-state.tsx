'use client'

import { Add01Icon, UserGroupIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

export const TeamsFirstTimeEmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-primary/30 bg-primary/5 py-20 text-center">
        <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
            <HugeiconsIcon icon={UserGroupIcon} className="size-6" />
        </span>
        <div className="font-medium">Build your first fantasy team</div>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Draft a lineup from today&apos;s slate and join your first tournament.
        </p>
        <Link
            href="/teams/new"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
            <HugeiconsIcon icon={Add01Icon} className="size-4" />
            Create a team
        </Link>
    </div>
)
