import { describe, expect, it, vi } from 'vitest'

import type { IGamesService } from '../../../services/games/games.service.interface'
import { GamesController } from '../games.controller'

const service = (overrides: Partial<IGamesService> = {}): IGamesService => ({
    getUpcomingGames: vi.fn().mockResolvedValue([]),
    getGameDetail: vi.fn().mockResolvedValue({ game: { gamePk: 1 } }),
    ...overrides,
})

describe('GamesController.getGameDetail', () => {
    it('passes a valid league to the service', async () => {
        const getGameDetail = vi.fn().mockResolvedValue({ game: { gamePk: 7 } })

        const res = await new GamesController(service({ getGameDetail })).getGameDetail('7', 'winter-leagues')

        expect(getGameDetail).toHaveBeenCalledWith(7, 'winter-leagues')
        expect(res.status).toBe(200)
    })

    it('defaults to MLB when no league is given', async () => {
        const getGameDetail = vi.fn().mockResolvedValue({ game: { gamePk: 7 } })

        await new GamesController(service({ getGameDetail })).getGameDetail('7', null)

        expect(getGameDetail).toHaveBeenCalledWith(7, 'mlb')
    })

    it('answers 400 for an unknown league and for a bad game id', async () => {
        const controller = new GamesController(service())

        expect((await controller.getGameDetail('7', 'moon-league')).status).toBe(400)
        expect((await controller.getGameDetail('abc', null)).status).toBe(400)
    })

    it('answers 404 for an unknown game', async () => {
        const res = await new GamesController(service({ getGameDetail: vi.fn().mockResolvedValue(null) })).getGameDetail('7', null)

        expect(res.status).toBe(404)
    })
})
