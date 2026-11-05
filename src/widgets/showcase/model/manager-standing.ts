import type { ManagerRow } from '@/shared/community'

export type RankMove = { direction: 'up' | 'down'; by: number } | null

export function rankMove(manager: Pick<ManagerRow, 'rank' | 'previousRank'>): RankMove {
    if (manager.rank === null || manager.previousRank === null || manager.previousRank === undefined || manager.rank === manager.previousRank) return null
    return manager.rank < manager.previousRank
        ? { direction: 'up', by: manager.previousRank - manager.rank }
        : { direction: 'down', by: manager.rank - manager.previousRank }
}

export function averagePoints(manager: Pick<ManagerRow, 'points' | 'entries'>): number {
    return manager.entries > 0 ? manager.points / manager.entries : 0
}

/** Flag and name for an ISO country code; null when the code is missing or unknown. */
export function countryLabel(code: string | null | undefined): string | null {
    if (!code || !/^[A-Za-z]{2}$/.test(code)) return null
    const upper = code.toUpperCase()
    const flag = String.fromCodePoint(...[...upper].map(letter => 0x1f1e6 + letter.charCodeAt(0) - 65))
    const name = new Intl.DisplayNames(['en'], { type: 'region' }).of(upper)
    return name && name !== upper ? `${flag} ${name}` : null
}

/** Podium order for wide screens: runner-up, winner, third. */
export function podiumOrder<T>(top: readonly T[]): { item: T; place: number }[] {
    const ranked = top.slice(0, 3).map((item, index) => ({ item, place: index + 1 }))
    return ranked.length === 3 ? [ranked[1], ranked[0], ranked[2]] : ranked
}

/** Oldest first, so a form chart reads left to right. */
export function formSeries(history: readonly { entryId: string; points: number; contest: { name: string; contestDate: string } }[]) {
    const series = [...history].reverse()
    const best = series.reduce((top, entry) => Math.max(top, entry.points), 0)
    const average = series.length ? series.reduce((sum, entry) => sum + entry.points, 0) / series.length : 0
    return { series, best, average }
}
