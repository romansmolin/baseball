import type { StatLine } from '../providers/dto/provider-player-profile.dto'

// MLB sends stats as numbers or strings, with placeholders like "-.--" for "no value".
export function num(value: string | number | undefined | null): number | null {
    if (value === undefined || value === null) return null
    const parsed = typeof value === 'number' ? value : Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
}

// MLB writes innings as "150.1", meaning 150 innings and one out.
export function innings(value: string | number | undefined | null): number | null {
    const raw = num(value)
    if (raw === null) return null
    const whole = Math.trunc(raw)
    return whole + Math.round((raw - whole) * 10) / 3
}

export function sum(lines: StatLine[], key: string): number {
    return lines.reduce((total, line) => total + (num(line[key]) ?? 0), 0)
}

export function ratio(numerator: number, denominator: number): number | null {
    return denominator > 0 ? numerator / denominator : null
}
