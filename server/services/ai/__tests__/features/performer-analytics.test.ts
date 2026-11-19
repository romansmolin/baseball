import { describe, expect, it, vi } from 'vitest'

import type { PerformerDetail } from '../../../../../src/shared/performers'
import type { IPerformersService } from '../../../performers/performers.service.interface'
import { PerformerAnalyticsFeature } from '../../features/performer-analytics.feature'

const detail = (games: PerformerDetail['games']) => ({ playerId: 1, games }) as PerformerDetail
const game = { date: '2026-11-18', opponent: 'X', points: 5, inWindow: true, summary: '', trend: 0.8 }

const build = (value: PerformerDetail | null) =>
    new PerformerAnalyticsFeature({
        getWeeklyTopPerformers: vi.fn(),
        getPerformerDetail: vi.fn().mockResolvedValue(value),
    } as IPerformersService)

describe('PerformerAnalyticsFeature', () => {
    it('returns the detail without any model usage', async () => {
        const result = await build(detail([game])).invoke('u1', { playerId: 1, group: 'hitting' })

        expect(result.output.playerId).toBe(1)
        expect(result.tokenUsage).toEqual({ inputTokens: 0, outputTokens: 0 })
    })

    it('fails, and so does not charge, for an unknown player or one with no games', async () => {
        await expect(build(null).invoke('u1', { playerId: 1, group: 'hitting' })).rejects.toThrow(/not found/)
        await expect(build(detail([])).invoke('u1', { playerId: 1, group: 'hitting' })).rejects.toThrow(/No games/)
    })
})
