import { randomUUID } from 'node:crypto'
export interface LeaseStore {
    acquire(key: string, token: string, now: Date, expiresAt: Date): Promise<boolean>
    release(key: string, token: string): Promise<void>
}
export async function withShowcaseLease<T>(store: LeaseStore, key: string, now: Date, work: (token: string) => Promise<T>, leaseMs = 60000): Promise<{ acquired: false } | { acquired: true; result: T }> {
    if (!Number.isFinite(leaseMs) || leaseMs < 1000) throw new Error('Lease duration must be at least one second')
    const token = randomUUID()
    if (!await store.acquire(key, token, now, new Date(now.getTime() + leaseMs))) return { acquired: false }
    try { return { acquired: true, result: await work(token) } }
    finally { await store.release(key, token) }
}
