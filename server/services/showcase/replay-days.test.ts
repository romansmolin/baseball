import { expect, it } from 'vitest'
import { collectPlayableReplayDays } from './replay-days'
it('skips empty and incomplete dates and continues until enough verified days exist', async () => {
    const data = new Map([['2025-07-14',null],['2025-07-15',{sourceDate:'2025-07-15'}],['2025-07-16',null],['2025-07-18',{sourceDate:'2025-07-18'}]])
    const result = await collectPlayableReplayDays([...data.keys()], 2, async date => data.get(date) ?? null)
    expect(result.map(r => r.sourceDate)).toEqual(['2025-07-15','2025-07-18'])
    await expect(collectPlayableReplayDays(['2025-07-14'], 2, async () => null)).rejects.toThrow('verified')
})
