export async function collectPlayableReplayDays<T>(candidates: string[], count: number, load: (date: string) => Promise<T | null>): Promise<T[]> {
    const days: T[] = []
    for (const candidate of candidates) {
        const day = await load(candidate)
        if (day !== null) days.push(day)
        if (days.length === count) return days
    }
    throw new Error(`Only ${days.length} verified replay days available; ${count} required`)
}
