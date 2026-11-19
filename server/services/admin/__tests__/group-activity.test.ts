import { expect, it } from 'vitest'
import { groupActivity } from '../group-activity'

it('groups consecutive uses of the same feature within 30 minutes', () => {
    const rows = [
        { id: 'a', feature: 'game_analysis', status: 'COMPLETED', costCredits: 300, createdAt: new Date('2026-01-01T10:00Z') },
        { id: 'b', feature: 'game_analysis', status: 'FAILED', costCredits: 300, createdAt: new Date('2026-01-01T10:15Z') },
        { id: 'c', feature: 'game_analysis', status: 'COMPLETED', costCredits: 300, createdAt: new Date('2026-01-01T11:00Z') },
    ]
    expect(groupActivity(rows).map(({ count, completed, failed }) => ({ count, completed, failed }))).toEqual([{ count: 1, completed: 1, failed: 0 }, { count: 2, completed: 1, failed: 1 }])
})
