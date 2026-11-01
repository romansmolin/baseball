import { randomUUID } from 'node:crypto'
export interface LeaseStore {
    acquire(key: string, token: string, now: Date, expiresAt: Date): Promise<boolean>
    release(key: string, token: string): Promise<void>
}
export async function withShowcaseLease<T>(store: LeaseStore, key: string, now: Date, work: () => Promise<T>): Promise<{ acquired: false } | { acquired: true; result: T }> {
    const token = randomUUID()
    if (!await store.acquire(key, token, now, new Date(now.getTime() + 60000))) return { acquired: false }
    try { return { acquired: true, result: await work() } }
    finally { await store.release(key, token) }
}
