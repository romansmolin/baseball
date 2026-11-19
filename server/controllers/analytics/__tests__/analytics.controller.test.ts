import { describe, expect, it, vi } from 'vitest'

import { ProviderUnavailableError } from '../../../providers/sports-provider.error'
import type { IAnalyticsService } from '../../../services/analytics/analytics.service.interface'
import { AnalyticsController } from '../analytics.controller'

const service = (overrides: Partial<IAnalyticsService> = {}): IAnalyticsService => ({
    getPlayerAnalytics: vi.fn().mockResolvedValue(null),
    comparePlayers: vi.fn().mockResolvedValue({ players: [], missingIds: [] }),
    ...overrides,
})

describe('AnalyticsController.getPlayerAnalytics', () => {
    it('answers 400 for a non-numeric id', async () => {
        const res = await new AnalyticsController(service()).getPlayerAnalytics('abc', new URLSearchParams())

        expect(res.status).toBe(400)
    })

    it('answers 404 for an unknown player', async () => {
        const res = await new AnalyticsController(service()).getPlayerAnalytics('1', new URLSearchParams())

        expect(res.status).toBe(404)
    })

    it('passes the requested season to the service', async () => {
        const getPlayerAnalytics = vi.fn().mockResolvedValue({ player: { id: 1 } })

        const res = await new AnalyticsController(service({ getPlayerAnalytics })).getPlayerAnalytics(
            '1',
            new URLSearchParams({ season: '2024' }),
        )

        expect(getPlayerAnalytics).toHaveBeenCalledWith(1, 2024)
        expect(res.status).toBe(200)
    })

    it('answers 503 when the data provider is down', async () => {
        const getPlayerAnalytics = vi.fn().mockRejectedValue(new ProviderUnavailableError('MLB down'))

        const res = await new AnalyticsController(service({ getPlayerAnalytics })).getPlayerAnalytics(
            '1',
            new URLSearchParams(),
        )

        expect(res.status).toBe(503)
    })
})

describe('AnalyticsController.comparePlayers', () => {
    it('answers 400 for fewer than two ids', async () => {
        const res = await new AnalyticsController(service()).comparePlayers(new URLSearchParams({ ids: '1' }))

        expect(res.status).toBe(400)
    })

    it('returns the compare result', async () => {
        const comparePlayers = vi.fn().mockResolvedValue({ players: [], missingIds: [3] })

        const res = await new AnalyticsController(service({ comparePlayers })).comparePlayers(
            new URLSearchParams({ ids: '1,3' }),
        )

        expect(comparePlayers).toHaveBeenCalledWith([1, 3], expect.any(Number))
        expect(await res.json()).toEqual({ players: [], missingIds: [3] })
    })
})
