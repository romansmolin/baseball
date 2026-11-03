import type { RecurringTemplateKey } from '@/shared/tournaments/recurring'
import type { RecurringWindow } from './recurring.types'

const templates: { key: RecurringTemplateKey; day: number; weeks: 1 | 2 | 4 }[] = [
    { key: 'weekly-sprint', day: 1, weeks: 1 },
    { key: 'diamond-cup', day: 3, weeks: 2 },
    { key: 'grand-championship', day: 5, weeks: 4 },
]
const dayMs = 86400000

function windowsBetween(start: Date, end: Date): RecurringWindow[] {
    const result: RecurringWindow[] = []
    for (let at = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 12); at < end.getTime(); at += dayMs) {
        if (at < start.getTime()) continue
        const date = new Date(at)
        const template = templates.find(t => t.day === date.getUTCDay())
        if (template) result.push({ templateKey: template.key, sourceSlug: 'north-america', startsAt: date, endsAt: new Date(at + template.weeks * 7 * dayMs), totalWeeks: template.weeks, configurationVersion: 1 })
    }
    return result
}

export function planRecurringStarts(now: Date, horizonDays = 14): RecurringWindow[] {
    if (!Number.isFinite(now.getTime()) || !Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > 14) throw new Error('Invalid recurring calendar horizon')
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + horizonDays))
    return windowsBetween(now, end).filter(w => w.startsAt > now)
}

export function planRecurringHistory(now: Date, days = 28): RecurringWindow[] {
    if (!Number.isFinite(now.getTime()) || !Number.isInteger(days) || days < 1 || days > 28) throw new Error('Invalid recurring history range')
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days))
    return windowsBetween(start, now)
}
