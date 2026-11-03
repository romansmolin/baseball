import { describe, expect, it } from 'vitest'

import { getPlayerStatSummary } from './player-display'

describe('player season stat summary', () => {
    it('shows a concise batting line for position players', () => {
        expect(getPlayerStatSummary({
            position: '1B',
            battingStats: { avg: '.275', homeRuns: 18, rbi: 52 },
        })).toEqual([
            ['AVG', '.275'],
            ['HR', '18'],
            ['RBI', '52'],
        ])
    })

    it('shows a concise pitching line and leaves unavailable values blank', () => {
        expect(getPlayerStatSummary({
            position: 'SP',
            pitchingStats: { era: '3.21', wins: 7 },
        })).toEqual([
            ['ERA', '3.21'],
            ['W', '7'],
            ['SO', '—'],
        ])
    })
})
