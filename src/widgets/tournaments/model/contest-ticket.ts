import { WINTER_LEAGUE_LABELS } from '@/shared/baseball'
import { RECURRING_SERIES_LABELS, type ContestCatalogItem, type RecurringTemplateKey } from '@/shared/tournaments'

export type ContestTab = 'open' | 'live' | 'results'

const DAY_MS = 86400000
const SOURCE_NAMES: Record<string, string> = {
    ...WINTER_LEAGUE_LABELS,
    mlb: 'MLB',
    'triple-a': 'Triple-A',
    'double-a': 'Double-A',
    'high-a': 'High-A',
    'single-a': 'Single-A',
    rookie: 'Rookie',
    'winter-leagues': 'Winter Leagues',
    'north-america': 'North American Leagues',
    'minor-leagues': 'Minor Leagues',
}

export function contestFormat(item: Pick<ContestCatalogItem, 'kind' | 'slateKey' | 'templateKey'>): string {
    if (item.kind === 'DAILY') return item.slateKey === 'weekend' ? 'Weekend Series' : 'Daily Lineup'
    if (item.kind === 'SERIES') return RECURRING_SERIES_LABELS[item.templateKey as RecurringTemplateKey] ?? 'Fantasy Series'
    return 'League tournament'
}

export function contestLength(item: Pick<ContestCatalogItem, 'kind' | 'slateKey' | 'startsAt' | 'endsAt'>): string {
    if (item.kind === 'DAILY') return item.slateKey === 'weekend' ? '2 days' : '1 day'
    const days = Math.max(1, Math.round((Date.parse(item.endsAt) - Date.parse(item.startsAt)) / DAY_MS))
    if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'}`
    const weeks = Math.round(days / 7)
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`
}

export function contestSources(item: Pick<ContestCatalogItem, 'sourceLeagues' | 'leagueSlug'>): string {
    const slugs = item.sourceLeagues?.length ? item.sourceLeagues : [item.leagueSlug]
    return slugs.map(slug => SOURCE_NAMES[slug] ?? slug.toUpperCase()).join(', ')
}

const DATE_SEGMENT = /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/

/** A contest's name repeats its format, leagues and date, which the ticket already shows; keep what is left. */
export function ticketTitle(item: Pick<ContestCatalogItem, 'name' | 'kind' | 'slateKey' | 'templateKey'>): string {
    const format = contestFormat(item)
    const sources = new Set(Object.values(SOURCE_NAMES))
    const rest = item.name.split(' · ').filter(segment => segment !== format && !sources.has(segment) && !DATE_SEGMENT.test(segment))
    return rest.join(' · ') || format
}

/** The date a ticket leads with depends on what the reader can still do about the contest. */
export function ticketDate(item: Pick<ContestCatalogItem, 'kind' | 'startsAt' | 'endsAt' | 'locksAt'>, tab: ContestTab): { label: string; at: string } {
    if (tab === 'open') return { label: 'Closes', at: item.locksAt ?? item.startsAt }
    if (tab === 'live') return item.kind === 'DAILY' ? { label: 'Started', at: item.startsAt } : { label: 'Ends', at: item.endsAt }
    return { label: 'Played', at: item.kind === 'DAILY' ? item.startsAt : item.endsAt }
}

export function ticketAction(item: Pick<ContestCatalogItem, 'kind'>, tab: ContestTab): string {
    if (tab === 'open') return item.kind === 'DAILY' ? 'Build lineup' : 'Join'
    return tab === 'live' ? 'View standings' : 'See results'
}

export function ticketHref(item: Pick<ContestCatalogItem, 'kind' | 'id'>, tab: ContestTab): string {
    return item.kind === 'DAILY'
        ? `/contests/${encodeURIComponent(item.id)}?view=${tab === 'results' ? 'history' : 'current'}`
        : `/tournaments?tournament=${encodeURIComponent(item.id)}`
}

/** Splits a page of tickets under month headings, keeping the order the server returned. */
export function groupTicketsByMonth<T extends Pick<ContestCatalogItem, 'kind' | 'startsAt' | 'endsAt' | 'locksAt'>>(items: readonly T[], tab: ContestTab): { month: string; items: T[] }[] {
    const format = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'America/New_York' })
    const groups: { month: string; items: T[] }[] = []
    for (const item of items) {
        const month = format.format(new Date(ticketDate(item, tab).at))
        const last = groups[groups.length - 1]
        if (last?.month === month) last.items.push(item)
        else groups.push({ month, items: [item] })
    }
    return groups
}
