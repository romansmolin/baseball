import Link from 'next/link'

import type { ContestCatalogItem } from '@/shared/tournaments'
import { buttonVariants } from '@/shared/ui/button'
import { cn } from '@/shared/utils'
import { contestFormat, contestLength, contestSources, ticketAction, ticketDate, ticketHref, ticketTitle, type ContestTab } from '../model/contest-ticket'

const part = (at: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'America/New_York' }).format(new Date(at))

const closingTime = (at: string) => new Intl.DateTimeFormat(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
}).format(new Date(at))

const STUB_STYLE: Record<ContestTab, string> = {
    open: 'bg-board/[0.07]',
    live: 'bg-muted/60',
    results: 'bg-transparent',
}

const ACTION_VARIANT: Record<ContestTab, 'default' | 'outline' | 'ghost'> = {
    open: 'default',
    live: 'outline',
    results: 'ghost',
}

/** Half-circle cut-outs where the stub tears off; the ticket's overflow clips the outer half. */
const NOTCH = 'absolute size-4 rounded-full border border-foreground/10 bg-background'

export function ContestTicket({ item, tab }: { item: ContestCatalogItem; tab: ContestTab }) {
    const date = ticketDate(item, tab)
    const cancelled = item.status === 'CANCELLED'
    const title = ticketTitle(item)
    const format = contestFormat(item)

    return (
        <article className="h-full">
            <Link
                href={ticketHref(item, tab)}
                className="group grid h-full overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:grid-cols-[minmax(0,1fr)_10.5rem]"
            >
                <div className="flex min-w-0 gap-5 p-5">
                    <time dateTime={date.at} className="w-14 shrink-0 leading-none">
                        <span className="block text-xs text-muted-foreground">{date.label}</span>
                        <span className="mt-2 block text-sm text-muted-foreground">{part(date.at, { month: 'short' })}</span>
                        <span className="mt-1 block font-anton text-4xl">{part(date.at, { day: 'numeric' })}</span>
                    </time>
                    <div className="min-w-0">
                        <h3 className="text-lg font-semibold leading-snug group-hover:text-primary">{title}</h3>
                        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm">
                            {title !== format && <span className="font-medium text-primary">{format}</span>}
                            <span className="text-muted-foreground">{contestLength(item)}</span>
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">{contestSources(item)}</p>
                        {tab === 'open' && <p className="mt-1 text-sm text-muted-foreground">Entries close {closingTime(date.at)}</p>}
                        {item.prizePoolCredits > 0 && <p className="mt-1 text-sm text-muted-foreground">Prize pool {item.prizePoolCredits.toLocaleString('en-US')} credits</p>}
                    </div>
                </div>
                <div className={cn('relative flex items-center justify-between gap-3 border-t border-dashed border-foreground/20 p-5 sm:flex-col sm:items-start sm:border-t-0 sm:border-l', STUB_STYLE[tab])}>
                    <span aria-hidden="true" className={cn(NOTCH, '-top-2 -left-2')} />
                    <span aria-hidden="true" className={cn(NOTCH, '-top-2 -right-2 sm:top-auto sm:right-auto sm:-bottom-2 sm:-left-2')} />
                    <div>
                        <p className="font-anton text-3xl leading-none">{item.memberCount.toLocaleString('en-US')}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.memberCount === 1 ? 'entry' : 'entries'}</p>
                        {cancelled ? <p className="mt-2 text-sm font-medium">Cancelled</p> : tab !== 'results' && <p className="mt-2 text-sm font-medium">{item.entryFeeCredits > 0 ? `${item.entryFeeCredits.toLocaleString('en-US')} credits` : 'Free'}</p>}
                    </div>
                    <span className={buttonVariants({ size: 'sm', variant: ACTION_VARIANT[tab] })}>{ticketAction(item, tab)}</span>
                </div>
            </Link>
        </article>
    )
}
