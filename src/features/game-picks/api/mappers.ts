import type { GamePicks } from '../model/types'

import type { GamePicksResponseDto } from './types'

export function mapGamePicksResponseToModel(dto: GamePicksResponseDto): GamePicks {
    return {
        gamePk: dto.output.gamePk,
        summary: dto.output.summary,
        picks: dto.output.picks.map((pick) => ({
            playerId: pick.externalPlayerId,
            playerName: pick.playerName,
            role: pick.role,
            reason: pick.reason,
        })),
    }
}
