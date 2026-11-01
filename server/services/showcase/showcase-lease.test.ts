import { expect, it } from 'vitest'
import { withShowcaseLease, type LeaseStore } from './showcase-lease'

it('permits only one owner and releases the lease after work throws', async () => {
    let owner: string | null = null
    const store: LeaseStore = {
        acquire: async (_key, token) => { if (owner) return false; owner = token; return true },
        release: async (_key, token) => { if (owner === token) owner = null },
    }
    await withShowcaseLease(store, 'tick', new Date(), async () => {
        expect(await withShowcaseLease(store, 'tick', new Date(), async () => 'second')).toEqual({ acquired: false })
        return 'first'
    })
    expect(owner).toBeNull()
    await expect(withShowcaseLease(store, 'tick', new Date(), async () => { throw new Error('upstream offline') })).rejects.toThrow('offline')
    expect(owner).toBeNull()
})
