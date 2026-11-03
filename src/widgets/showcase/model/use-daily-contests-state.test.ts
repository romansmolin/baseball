import { describe, expect, it } from 'vitest'
import { resolveDailyContestsState, type DailyContestsSelection } from './use-daily-contests-state'

describe('daily contests URL state', () => {
    it('follows a changed route view and resets pagination', () => {
        const previous: DailyContestsSelection = { routeView: 'current', view: 'current', offset: 40 }
        expect(resolveDailyContestsState(previous, 'history')).toEqual({ routeView: 'history', view: 'history', offset: 0 })
    })

    it('keeps an in-page selection while the route query is unchanged', () => {
        const selected: DailyContestsSelection = { routeView: 'current', view: 'history', offset: 20 }
        expect(resolveDailyContestsState(selected, 'current')).toEqual(selected)
    })
})
