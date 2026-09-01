import { describe, expect, it } from 'vitest'

import {
    FIELD_SLOTS,
    type PoolPlayer,
    type Roster,
} from '@/shared/team-builder'

import {
    evaluatePlayerPlacement,
    findRosterSlotForPlayer,
    mergeAutofillPicks,
} from '../team-builder-roster'

const emptyRoster = (): Roster =>
    FIELD_SLOTS.reduce<Roster>((roster, slot) => {
        roster[slot.key] = null
        return roster
    }, {} as Roster)

const player = (id: number, pos: PoolPlayer['pos']): PoolPlayer => ({
    id,
    name: `Player ${id}`,
    pos,
    team: 'T',
    leagueSlug: 'mlb',
    leagueColor: '#000000',
    salary: 5000,
    proj: 10,
    photoUrl: null,
})

describe('team-builder roster reconciliation', () => {
    it('leaves an AI slot genuinely empty when player metadata cannot be resolved', () => {
        const result = mergeAutofillPicks({
            roster: emptyRoster(),
            picks: [{ slotKey: 'P', externalPlayerId: 101 }],
            playersById: new Map(),
        })

        expect(result.roster.P).toBeNull()
        expect(result.assignedPicks).toEqual([])
        expect(findRosterSlotForPlayer(result.roster, player(102, 'P'))?.key).toBe('P')
    })

    it('allows a manually chosen player to replace the focused AI slot', () => {
        const roster = emptyRoster()
        roster.SS = 201
        const aiPlayer = player(201, 'SS')
        const replacement = player(202, 'SS')

        const placement = evaluatePlayerPlacement({
            roster,
            player: replacement,
            targetSlotKey: 'SS',
            salaryUsed: aiPlayer.salary,
            salaryCap: 80000,
            playerById: (id) => (id === aiPlayer.id ? aiPlayer : undefined),
        })

        expect(placement).toMatchObject({
            allowed: true,
            slot: { key: 'SS' },
            replacedPlayerId: aiPlayer.id,
        })
    })

    it('rerunning AI never duplicates an already rostered player', () => {
        const roster = emptyRoster()
        roster.LF = 301
        const existing = player(301, 'OF')

        const result = mergeAutofillPicks({
            roster,
            picks: [{ slotKey: 'LF', externalPlayerId: existing.id }],
            playersById: new Map([[existing.id, existing]]),
        })

        expect(Object.values(result.roster).filter((id) => id === existing.id)).toHaveLength(1)
        expect(result.assignedPicks).toEqual([])
    })

    it('keeps other slots editable when one AI pick cannot be resolved', () => {
        const catcher = player(401, 'C')
        const result = mergeAutofillPicks({
            roster: emptyRoster(),
            picks: [
                { slotKey: 'C', externalPlayerId: catcher.id },
                { slotKey: 'P', externalPlayerId: 402 },
            ],
            playersById: new Map([[catcher.id, catcher]]),
        })

        expect(result.roster.C).toBe(catcher.id)
        expect(result.roster.P).toBeNull()
        expect(findRosterSlotForPlayer(result.roster, player(403, 'P'))?.key).toBe('P')
    })

    it('enforces the salary cap after subtracting the replaced player salary', () => {
        const roster = emptyRoster()
        const current = { ...player(501, 'C'), salary: 4000 }
        const affordable = { ...player(502, 'C'), salary: 6000 }
        const tooExpensive = { ...player(503, 'C'), salary: 9000 }
        roster.C = current.id
        const playerById = (id: number) => (id === current.id ? current : undefined)

        expect(
            evaluatePlayerPlacement({
                roster,
                player: affordable,
                targetSlotKey: 'C',
                salaryUsed: 78000,
                salaryCap: 80000,
                playerById,
            }).allowed,
        ).toBe(true)
        expect(
            evaluatePlayerPlacement({
                roster,
                player: tooExpensive,
                targetSlotKey: 'C',
                salaryUsed: 78000,
                salaryCap: 80000,
                playerById,
            }),
        ).toEqual({ allowed: false, reason: 'over-budget' })
    })
})
