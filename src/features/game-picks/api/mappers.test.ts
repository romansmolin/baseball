import { describe, expect, it } from 'vitest'

import { mapGamePicksResponseToModel } from './mappers'
import type { GamePicksResponseDto } from './types'

const dto: GamePicksResponseDto = {
    output: {
        gamePk: 99,
        picks: [
            { externalPlayerId: 660271, playerName: 'Shohei Ohtani', role: 'start', reason: 'Hot bat.' },
            { externalPlayerId: 592450, playerName: 'Aaron Judge', role: 'sit', reason: 'Weak against lefties.' },
        ],
        summary: 'Lean on the home bats.',
    },
    modelUsed: 'gpt-5.4',
    tokenUsage: { inputTokens: 100, outputTokens: 50 },
}

describe('mapGamePicksResponseToModel', () => {
    it('keeps the summary and renames externalPlayerId to playerId', () => {
        expect(mapGamePicksResponseToModel(dto)).toEqual({
            gamePk: 99,
            summary: 'Lean on the home bats.',
            picks: [
                { playerId: 660271, playerName: 'Shohei Ohtani', role: 'start', reason: 'Hot bat.' },
                { playerId: 592450, playerName: 'Aaron Judge', role: 'sit', reason: 'Weak against lefties.' },
            ],
        })
    })

    it('does not leak billing or model details into the model', () => {
        const model = mapGamePicksResponseToModel(dto)

        expect(model).not.toHaveProperty('modelUsed')
        expect(model).not.toHaveProperty('tokenUsage')
    })
})
