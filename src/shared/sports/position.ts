export type Position = 'SP' | 'RP' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'OF' | 'DH'
export type PositionGroup = 'P' | 'IF' | 'OF' | 'C'

export const POSITION_GROUP: Record<Position, PositionGroup> = {
    SP: 'P',
    RP: 'P',
    C: 'C',
    '1B': 'IF',
    '2B': 'IF',
    '3B': 'IF',
    SS: 'IF',
    OF: 'OF',
    DH: 'IF',
}

export const POSITIONS: readonly Position[] = ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'OF', 'DH']
