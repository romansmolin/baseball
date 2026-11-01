import { expect, it } from 'vitest'
import { runOfflineFirst } from './showcase-phases'
it('preserves offline progress even if live calendar fails repeatedly', async () => {
    const entries: number[] = []
    const result = await runOfflineFirst(async () => { entries.push(1); return {inserted:entries.length} }, async () => { throw new Error('MLB offline') })
    expect(entries).toEqual([1])
    expect(result).toEqual({inserted:1,calendarError:'MLB offline'})
})
