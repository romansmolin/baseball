import type { Confidence } from '@/shared/estimates'

export const NO_VALUE = '—'

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
    low: 'Low confidence',
    medium: 'Medium confidence',
    high: 'High confidence',
}

// AVG, OBP, SLG, OPS: three decimals, no leading zero below 1 (".300", "1.014").
export function formatRate(value: number | null): string {
    if (value === null) return NO_VALUE
    const text = value.toFixed(3)
    return value < 1 ? text.replace(/^0/, '') : text
}

export function formatDecimal(value: number | null, digits = 2): string {
    return value === null ? NO_VALUE : value.toFixed(digits)
}

export function formatCount(value: number | null): string {
    return value === null ? NO_VALUE : String(value)
}

// Innings are stored in thirds; MLB writes the outs after the point (150.1 = 150 and one out).
export function formatInnings(value: number | null): string {
    if (value === null) return NO_VALUE
    const outs = Math.round(value * 3)
    return `${Math.floor(outs / 3)}.${outs % 3}`
}

export function formatScore(value: number | null): string {
    return value === null ? NO_VALUE : String(Math.round(value))
}

// An estimate is never shown more precisely than a whole percent.
export function formatPercentEstimate(probability: number): string {
    return `${Math.round(probability * 100)}%`
}
