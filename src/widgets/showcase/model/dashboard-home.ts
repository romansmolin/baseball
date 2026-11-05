import type { ContestCatalogItem } from '@/shared/tournaments'

export type ContestPhase = 'open' | 'live' | 'final'

/** Series and tournaments accept entries while DRAFTING, daily contests while OPEN. */
export function contestPhase(item: Pick<ContestCatalogItem, 'status'>): ContestPhase {
    if (item.status === 'OPEN' || item.status === 'DRAFTING') return 'open'
    if (item.status === 'COMPLETED' || item.status === 'ARCHIVED' || item.status === 'CANCELLED') return 'final'
    return 'live'
}

/** Entries close at the lock time; series without one close when they start. */
export function closingTime(item: Pick<ContestCatalogItem, 'locksAt' | 'startsAt'>): number {
    return Date.parse(item.locksAt ?? item.startsAt)
}

export function selectNextContest(items: readonly ContestCatalogItem[], now: number): ContestCatalogItem | null {
    if (!Number.isFinite(now)) return null
    return items
        .filter(item => contestPhase(item) === 'open' && closingTime(item) > now)
        .sort((a, b) => closingTime(a) - closingTime(b) || a.id.localeCompare(b.id))[0] ?? null
}

/** Contests in play stay listed for a day after their end; later than that they are waiting for final scoring. */
const OVERDUE_GRACE_MS = 24 * 3600000

export function isOverdue(item: Pick<ContestCatalogItem, 'status' | 'endsAt'>, now: number): boolean {
    return contestPhase(item) === 'live' && Date.parse(item.endsAt) < now - OVERDUE_GRACE_MS
}

/** The moment a listed contest matters most: when entries close, or when a running one ends. */
export function activeTime(item: Pick<ContestCatalogItem, 'kind' | 'status' | 'startsAt' | 'locksAt' | 'endsAt'>): number {
    return contestPhase(item) === 'live' && item.kind !== 'DAILY' ? Date.parse(item.endsAt) : closingTime(item)
}

export interface ContestSchedule {
    today: ContestCatalogItem[]
    thisMonth: ContestCatalogItem[]
    nextMonths: ContestCatalogItem[]
    later: ContestCatalogItem[]
}

const SCHEDULE_ZONE = 'America/New_York'

/** Calendar day (YYYY-MM-DD) in the zone contests are scheduled in. */
function scheduleDay(ms: number): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: SCHEDULE_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms)
}

const monthIndex = (day: string) => Number(day.slice(0, 4)) * 12 + Number(day.slice(5, 7))

/**
 * Sorts contests that are not finished into today, the rest of this month, the
 * two following months and everything after. Contests already in play count as
 * today; open ones follow the day their entries close.
 */
export function groupContestsBySchedule(items: readonly ContestCatalogItem[], now: number): ContestSchedule {
    const schedule: ContestSchedule = { today: [], thisMonth: [], nextMonths: [], later: [] }
    if (!Number.isFinite(now)) return schedule
    const today = scheduleDay(now)

    const sorted = items
        .filter(item => contestPhase(item) !== 'final' && Number.isFinite(closingTime(item)) && !isOverdue(item, now))
        .sort((a, b) => activeTime(a) - activeTime(b) || a.id.localeCompare(b.id))

    for (const item of sorted) {
        const day = scheduleDay(closingTime(item))
        const monthsAhead = monthIndex(day) - monthIndex(today)
        if (contestPhase(item) === 'live' || day <= today) schedule.today.push(item)
        else if (monthsAhead <= 0) schedule.thisMonth.push(item)
        else if (monthsAhead <= 2) schedule.nextMonths.push(item)
        else schedule.later.push(item)
    }
    return schedule
}

export function formatCountdown(target: number, now: number): string {
    const minutes = Math.floor((target - now) / 60000)
    if (!Number.isFinite(minutes) || minutes <= 0) return 'now'
    const days = Math.floor(minutes / 1440)
    const hours = Math.floor((minutes % 1440) / 60)
    if (days > 0) return `${days}d ${hours}h`
    return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}

export function contestSeriesLabel(item: Pick<ContestCatalogItem, 'kind' | 'slateKey' | 'templateKey'>): string {
    if (item.kind === 'DAILY') return item.slateKey === 'weekend' ? 'Weekend Series' : 'Daily Lineup'
    if (item.kind === 'SERIES') return item.templateKey?.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ') ?? 'Fantasy Series'
    return 'League tournament'
}

export function contestHref(item: Pick<ContestCatalogItem, 'kind' | 'id'>): string {
    return item.kind === 'DAILY'
        ? `/contests/${encodeURIComponent(item.id)}`
        : `/tournaments?tournament=${encodeURIComponent(item.id)}`
}

export function entryFeeLabel(credits: number): string {
    return credits > 0 ? `${credits.toLocaleString('en-US')} credits` : 'Free'
}

/** Gap between the winner and the runner-up; null when fewer than two entries scored. */
export function winningMargin(standings: readonly { points: number }[]): number | null {
    return standings.length >= 2 ? Math.max(0, standings[0].points - standings[1].points) : null
}

/** Bar length as a share of the winning score, never so short that the row looks empty. */
export function barWidth(points: number, top: number): number {
    return top > 0 ? Math.min(100, Math.max(8, Math.round(points / top * 100))) : 0
}

/** How far a manager is from the top of the standings, as a short sentence. */
export function gapToLeader(points: number, leaderPoints: number, leaderName: string, isLeader: boolean): string {
    if (isLeader) return 'You are leading the standings.'
    const gap = Math.max(0, leaderPoints - points)
    return `${gap.toLocaleString('en-US', { maximumFractionDigits: 1 })} pts behind ${leaderName}.`
}
