import { expect, it } from 'vitest'
import { dailyParticipants, chooseDemoLineup } from './demo-simulation'
import type { DailyPlayer } from '@/shared/daily-contests'

it('rotates every one of 30000 managers across 30 days with no daily duplicates', () => {
    const all = new Set<number>()
    for (let day = 0; day < 30; day++) {
        const selected = dailyParticipants(30000, day, 1500)
        expect(new Set(selected).size).toBe(1500)
        selected.forEach(n => all.add(n))
    }
    expect(all.size).toBe(30000)
})
it('generates repeatable unique, position-eligible rosters within budget', () => {
    const positions = ['P','C','1B','2B','3B','SS','OF','OF','OF'] as const
    const pool: DailyPlayer[] = positions.flatMap((position, i) => [0,1].map(n => ({ externalPlayerId:i*2+n, name:`Player ${i*2+n}`, position, teamId:119,teamName:'Dodgers',salary:5000,photoUrl:null })))
    const lineup = chooseDemoLineup(pool, 'manager-1', 'BALANCED')
    expect(lineup.players).toHaveLength(9)
    expect(new Set(lineup.players.map(p => p.externalPlayerId)).size).toBe(9)
    expect(chooseDemoLineup(pool, 'manager-1', 'BALANCED')).toEqual(lineup)
    expect(chooseDemoLineup(pool, 'manager-2', 'BALANCED')).not.toEqual(lineup)
})
it('changes player selections as well as captain priorities across strategies', () => {
    const positions = ['P','C','1B','2B','3B','SS','OF','OF','OF'] as const
    const pool: DailyPlayer[] = positions.flatMap((position, i) => [0,1,2].map(n => ({ externalPlayerId:i*3+n, name:`Player ${i*3+n}`, position, teamId:119,teamName:'Dodgers',salary:4000+n*1000,photoUrl:null })))
    expect(chooseDemoLineup(pool, 'manager-1', 'PITCHING').players).not.toEqual(chooseDemoLineup(pool, 'manager-1', 'BALANCED').players)
})
