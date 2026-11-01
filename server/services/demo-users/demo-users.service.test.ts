import { describe, expect, it } from 'vitest'
import { fetchRandomUsers, planDemoProfiles, type ExistingDemoUser } from './demo-users.service'

describe('demo profile import', () => {
    const identities = Array.from({ length: 3 }, () => ({ name: { first: 'Alex', last: 'Müller' }, nat: 'DE' }))
    it('keeps existing identities and gives duplicate names unique usernames', () => {
        const existing: ExistingDemoUser[] = [{ id: 'old', provider: 'demo', role: 'USER', email: 'demo-1@managers.local', paymentCount: 0, demoKey: null }]
        const plan = planDemoProfiles(identities, existing, 'club')
        expect(plan.rows[0].existingUserId).toBe('old')
        expect(new Set(plan.rows.map(r => r.username)).size).toBe(3)
        expect(plan.rows[1].email).toMatch(/@managers.invalid$/)
        expect(plan.rows.map(r => r.demoKey)).toEqual(planDemoProfiles(identities, existing, 'club').rows.map(r => r.demoKey))
    })
    it('preserves real accounts, commissioners, and accounts with payments', () => {
        const users: ExistingDemoUser[] = [
            { id: 'real', provider: null, role: 'USER', email: 'a@example.com', paymentCount: 0, demoKey: null },
            { id: 'admin', provider: 'demo', role: 'ADMIN', email: 'demo-1@managers.local', paymentCount: 0, demoKey: null },
            { id: 'paid', provider: 'demo', role: 'USER', email: 'demo-2@managers.local', paymentCount: 1, demoKey: null },
        ]
        const result = planDemoProfiles(identities, users, 'club')
        expect(result.rows.every(r => r.existingUserId === null)).toBe(true)
        expect(result.skippedIds).toEqual(['real', 'admin', 'paid'])
    })
    it('fetches stable pages and rejects errors before producing an import manifest', async () => {
        const calls: string[] = []
        const fetcher = async (url: string) => { calls.push(url); return new Response(JSON.stringify({ results: identities })) }
        const result = await fetchRandomUsers({ seed: 'club', page: 2, results: 3 }, fetcher)
        expect(result).toHaveLength(3)
        expect(calls[0]).toContain('/api/1.4/')
        expect(calls[0]).toContain('page=2')
        await expect(fetchRandomUsers({ seed: 'club', page: 1, results: 3 }, async () => new Response('{"error":"offline"}'))).rejects.toThrow()
    })
    it('rejects partial batches instead of silently shrinking the cohort', async () => {
        await expect(fetchRandomUsers({ seed: 'club', page: 1, results: 4 }, async () => new Response(JSON.stringify({ results: identities })))).rejects.toThrow('count')
    })
    it('respects Retry-After on rate limits and then returns validated identities', async () => {
        let attempt = 0
        const waits: number[] = []
        const result = await fetchRandomUsers({ seed:'club',page:1,results:3 }, async () => ++attempt === 1 ? new Response('', { status:429,headers:{'Retry-After':'2'} }) : new Response(JSON.stringify({results:identities})), async ms => { waits.push(ms) })
        expect(result).toHaveLength(3)
        expect(waits).toEqual([2000])
    })
    it('waits for the upstream minute quota to reset when 429 has no Retry-After', async () => {
        let attempt = 0
        const waits: number[] = []
        await fetchRandomUsers({seed:'club',page:1,results:3}, async () => ++attempt === 1 ? new Response('',{status:429}) : new Response(JSON.stringify({results:identities})), async ms => { waits.push(ms) })
        expect(waits).toEqual([60000])
    })
})
