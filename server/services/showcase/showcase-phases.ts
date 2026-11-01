export async function runOfflineFirst<T>(offline: () => Promise<T>, calendar: () => Promise<unknown>): Promise<T & { calendarError: string | null }> {
    const result = await offline()
    try { await calendar(); return { ...result, calendarError: null } }
    catch (error) { return { ...result, calendarError: error instanceof Error ? error.message : 'Calendar update failed' } }
}
