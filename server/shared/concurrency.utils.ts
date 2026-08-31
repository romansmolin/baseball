// Runs `fn` over `items` with at most `limit` promises in flight at once.
// Preserves input order in the result. A rejecting `fn` rejects the whole
// call — callers that need per-item error isolation should catch inside `fn`.
export async function mapWithConcurrency<T, R>(
    items: readonly T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
    if (items.length === 0) return []
    const bound = Math.max(1, Math.min(limit, items.length))
    const results = new Array<R>(items.length)
    let cursor = 0

    async function worker(): Promise<void> {
        while (true) {
            const index = cursor++
            if (index >= items.length) return
            results[index] = await fn(items[index], index)
        }
    }

    await Promise.all(Array.from({ length: bound }, () => worker()))
    return results
}
