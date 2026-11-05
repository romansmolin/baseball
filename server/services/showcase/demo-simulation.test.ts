import { expect, it } from 'vitest'
import { dailyParticipants, chooseDemoLineup, demoEntryTarget, demoEntryTime, demoTeamName } from './demo-simulation'
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

it('varies turnout by date and gives a new contest an opening wave of entries', () => {
    expect(demoEntryTarget('2026-11-07', 'classic', 30000)).toBeGreaterThan(demoEntryTarget('2026-11-09', 'classic', 30000))
    expect(demoEntryTarget('2026-11-07', 'weekend', 30000)).toBeGreaterThan(demoEntryTarget('2026-11-07', 'classic', 30000))
    expect(demoEntryTarget('2026-11-07', 'classic', 40)).toBe(40)
    const contest = { createdAt: new Date('2026-11-03T00:00:00Z'), locksAt: new Date('2026-11-05T00:00:00Z') }
    expect(demoEntryTime(contest, 0, 100)).toEqual(contest.createdAt)
    expect(demoEntryTime(contest, 9, 100)).toEqual(contest.createdAt)
    expect(demoEntryTime(contest, 10, 100)).toEqual(contest.createdAt)
    expect(demoEntryTime(contest, 99, 100).getTime()).toBeLessThanOrEqual(contest.locksAt.getTime())
    expect(demoEntryTime(contest, 55, 100).getTime()).toBeGreaterThan(contest.createdAt.getTime())
})

it('gives each manager one readable club name that varies across managers', () => {
    expect(demoTeamName('manager-1')).toBe(demoTeamName('manager-1'))
    expect(demoTeamName('manager-1')).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+( BC| Nine| Baseball| Club)?$/)
    expect(new Set(Array.from({ length: 1000 }, (_, i) => demoTeamName(`manager-${i}`))).size).toBeGreaterThan(800)
})

it('keeps risky lineups near the cap instead of falling back to the cheapest players', () => {
    const positions = ['P', 'C', '1B', '2B', '3B', 'SS', 'OF'] as const
    const pool: DailyPlayer[] = positions.flatMap((position, p) => Array.from({ length: 60 }, (_, i) => ({ externalPlayerId: p * 100 + i + 1, name: `${position} ${i}`, position, teamId: 1, teamName: 'Club', salary: 3000 + (i % 15) * 500, photoUrl: null })))
    const cost = (seed: string) => chooseDemoLineup(pool, seed, 'RISKY').players.reduce((sum, pick) => sum + pool.find(player => player.externalPlayerId === pick.externalPlayerId)!.salary, 0)
    for (const seed of ['a', 'b', 'c']) {
        expect(cost(seed)).toBeGreaterThan(50000)
        expect(cost(seed)).toBeLessThanOrEqual(80000)
    }
})
