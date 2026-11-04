import { describe, expect, it } from 'vitest'

import { mapStandingsToGroups } from './standings.mapper'

const team = (id: number, name: string, wins: number, losses: number) => ({ team: { id, name }, wins, losses, winningPercentage: '.500', gamesBack: '-', runDifferential: 3, streak: { streakCode: 'W2' } })

describe('mapStandingsToGroups', () => {
    it('makes one group per league and division and labels winter leagues', () => {
        const groups = mapStandingsToGroups(
            { records: [
                { league: { id: 1, name: 'Liga Venezuela Beisbol Profesional' }, teamRecords: [team(10, 'Caribes', 15, 4)] },
                { league: { id: 2, name: 'Eastern League' }, division: { id: 7, name: 'East' }, teamRecords: [team(20, 'Hartford', 3, 2)] },
                { league: { id: 3, name: 'Empty' }, teamRecords: [] },
            ] },
            (name) => (name === 'Liga Venezuela Beisbol Profesional' ? 'Venezuelan League' : name),
        )
        expect(groups.map((g) => g.name)).toEqual(['Venezuelan League', 'Eastern League · East'])
        expect(groups[0].rows[0]).toMatchObject({ teamId: 10, wins: 15, losses: 4, streak: 'W2' })
    })
})
