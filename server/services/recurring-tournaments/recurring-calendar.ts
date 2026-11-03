import type { RecurringTemplateKey } from '@/shared/tournaments/recurring'
import { winterContestsEnabled } from '../../providers/contest-source-registry'
import type { RecurringWindow } from './recurring.types'

export type RecurringSource = RecurringWindow['sourceSlug']

const templates: { key: RecurringTemplateKey; day: number; weeks: 1 | 2 | 4 }[] = [
    { key: 'weekly-sprint', day: 1, weeks: 1 },
    { key: 'diamond-cup', day: 3, weeks: 2 },
    { key: 'grand-championship', day: 5, weeks: 4 },
]
const dayMs = 86400000

function windowsBetween(start: Date, end: Date, sources: readonly RecurringSource[]): RecurringWindow[] {
    const result: RecurringWindow[] = []
    for (let at = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 12); at < end.getTime(); at += dayMs) {
        if (at < start.getTime()) continue
        const date = new Date(at)
        const template = templates.find(t => t.day === date.getUTCDay())
        if (template) for (const sourceSlug of sources) result.push({ templateKey: template.key, sourceSlug, startsAt: date, endsAt: new Date(at + template.weeks * 7 * dayMs), totalWeeks: template.weeks, configurationVersion: 1 })
    }
    return result
}

export const DEFAULT_RECURRING_HORIZON_DAYS = 14
export const MAX_RECURRING_HORIZON_DAYS = 200

/** CONTEST_SERIES_HORIZON_DAYS widens how far ahead series are published; invalid values fall back to the default. */
export function recurringHorizonDays(env: Record<string, string | undefined>): number {
    const value = Number(env.CONTEST_SERIES_HORIZON_DAYS)
    return Number.isInteger(value) && value >= DEFAULT_RECURRING_HORIZON_DAYS && value <= MAX_RECURRING_HORIZON_DAYS ? value : DEFAULT_RECURRING_HORIZON_DAYS
}

/** Sources new series are published for; Winter Leagues only when CONTEST_WINTER_ENABLED is set. */
export function recurringSources(env: Record<string, string | undefined>): RecurringSource[] {
    return winterContestsEnabled(env) ? ['north-america', 'winter-leagues'] : ['north-america']
}

export function planRecurringStarts(now: Date, horizonDays = DEFAULT_RECURRING_HORIZON_DAYS, sources: readonly RecurringSource[] = ['north-america']): RecurringWindow[] {
    if (!Number.isFinite(now.getTime()) || !Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > MAX_RECURRING_HORIZON_DAYS) throw new Error('Invalid recurring calendar horizon')
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + horizonDays))
    return windowsBetween(now, end, sources).filter(w => w.startsAt > now)
}

export function planRecurringHistory(now: Date, days = 28): RecurringWindow[] {
    if (!Number.isFinite(now.getTime()) || !Number.isInteger(days) || days < 1 || days > 28) throw new Error('Invalid recurring history range')
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days))
    return windowsBetween(start, now, ['north-america'])
}
