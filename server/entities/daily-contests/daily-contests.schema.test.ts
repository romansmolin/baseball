import { describe, expect, it } from 'vitest'
import { dailyListSchema } from './daily-contests.schema'

describe('dailyListSchema views', () => {
    it('maps the legacy Replay query to history', () => {
        expect(dailyListSchema.parse({ mode: 'REPLAY' }).view).toBe('history')
    })

    it('rejects statuses that do not belong to the selected view', () => {
        expect(dailyListSchema.safeParse({ view: 'history', status: 'OPEN' }).success).toBe(false)
        expect(dailyListSchema.safeParse({ view: 'current', status: 'COMPLETED' }).success).toBe(false)
    })

    it('rejects Replay in the current games view', () => {
        expect(dailyListSchema.safeParse({ view: 'current', mode: 'REPLAY' }).success).toBe(false)
    })
})
