import type { SupportedBaseballLeague } from '@/shared/baseball'

import type { PositionFilter, StatusFilter } from './player.type'

export const PLAYERS_PER_PAGE = 10

export interface PlayersQueryState {
    league: SupportedBaseballLeague
    search: string
    position: PositionFilter
    status: StatusFilter
    offset: number
    limit: number
}

type PlayerFilterPatch = Partial<Pick<PlayersQueryState, 'league' | 'search' | 'position' | 'status'>>
type PlayerQueryPatch = PlayerFilterPatch | { offset: number }

export function updatePlayersQuery(
    state: PlayersQueryState,
    patch: PlayerQueryPatch,
): PlayersQueryState {
    const filterChanged = Object.entries(patch).some(
        ([key, value]) => key !== 'offset' && state[key as keyof PlayersQueryState] !== value,
    )

    return {
        ...state,
        ...patch,
        offset: 'offset' in patch ? Math.max(0, patch.offset) : filterChanged ? 0 : state.offset,
        limit: PLAYERS_PER_PAGE,
    }
}

export function getPlayersPageRange(offset: number, total: number): string {
    if (total === 0) return '0 players'
    return `${offset + 1}–${Math.min(offset + PLAYERS_PER_PAGE, total)} of ${total}`
}
