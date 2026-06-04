import type { Position } from '@/shared/sports'

const POSITION_TABLE: Record<string, Position> = {
    P: 'SP',
    SP: 'SP',
    RP: 'RP',
    C: 'C',
    '1B': '1B',
    '2B': '2B',
    '3B': '3B',
    SS: 'SS',
    LF: 'OF',
    CF: 'OF',
    RF: 'OF',
    OF: 'OF',
    DH: 'DH',
    TWP: 'DH',
}

export function mapMlbPositionToPosition(abbreviation: string | undefined | null): Position {
    if (!abbreviation) return 'DH'
    const mapped = POSITION_TABLE[abbreviation.toUpperCase()]
    if (mapped) return mapped
    console.warn(`[mlb-position.mapper] unknown MLB position "${abbreviation}", defaulting to DH`)
    return 'DH'
}

export function mapMlbBatSide(code: string | undefined | null): 'L' | 'R' | 'S' | null {
    if (code === 'L' || code === 'R' || code === 'S') return code
    return null
}

export function mapMlbThrowHand(code: string | undefined | null): 'L' | 'R' | null {
    if (code === 'L' || code === 'R') return code
    return null
}
