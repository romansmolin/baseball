import Link from 'next/link'

import { cn } from '@/shared/utils'

interface PreviewToggleProps {
    current: 'new' | 'returning'
}

export const PreviewToggle = ({ current }: PreviewToggleProps) => (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-foreground uppercase">
                Dev
            </span>{' '}
            Preview as:
        </span>
        <div className="flex gap-2">
            <Link
                href="/dashboard?view=new"
                className={cn(
                    'rounded-full border px-3 py-1 transition-colors',
                    current === 'new'
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-foreground/15 hover:bg-muted',
                )}
            >
                New user
            </Link>
            <Link
                href="/dashboard?view=returning"
                className={cn(
                    'rounded-full border px-3 py-1 transition-colors',
                    current === 'returning'
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-foreground/15 hover:bg-muted',
                )}
            >
                Returning user
            </Link>
        </div>
    </div>
)
