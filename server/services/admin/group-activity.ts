type Activity = { id: string; feature: string; status: string; costCredits: number; createdAt: Date }
export function groupActivity(rows: Activity[]) {
    const batches: { id: string; style: string; count: number; completed: number; failed: number; credits: number; startedAt: Date; endedAt: Date }[] = []
    for (const row of [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
        let batch = batches.at(-1)
        if (!batch || batch.style !== row.feature || row.createdAt.getTime() - batch.endedAt.getTime() > 30 * 60 * 1000) {
            batch = { id: row.id, style: row.feature, count: 0, completed: 0, failed: 0, credits: 0, startedAt: row.createdAt, endedAt: row.createdAt }
            batches.push(batch)
        }
        batch.count++
        batch.credits += row.costCredits
        batch.endedAt = row.createdAt
        if (row.status === 'COMPLETED') batch.completed++
        if (row.status === 'FAILED') batch.failed++
    }
    return batches.reverse()
}
