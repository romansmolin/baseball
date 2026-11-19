import { describe, expect, it } from 'vitest'

import {
    DEFAULT_SLOT_CONFIG,
    buildSlots,
    type PoolPlayer,
} from '@/shared/team-builder'

import {
    createEmptyRoster,
    evaluatePlayerPlacement,
    findRosterSlotForPlayer,
    mergeAutofillPicks,
    remapRoster,
} from '../team-builder-roster'

const slots = buildSlots(DEFAULT_SLOT_CONFIG)
const emptyRoster = () => createEmptyRoster(slots)

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
            picks: [{ slotId: 'P:0', externalPlayerId: 101 }],
            playersById: new Map(),
            slots,
        })

        expect(result.roster['P:0']).toBeNull()
        expect(result.assignedPicks).toEqual([])
        expect(findRosterSlotForPlayer(result.roster, player(102, 'P'), null, slots)?.id).toBe('P:0')
    })

    it('allows a manually chosen player to replace the focused AI slot', () => {
        const roster = emptyRoster()
        roster['SS:0'] = 201
        const aiPlayer = player(201, 'SS')
        const replacement = player(202, 'SS')

        const placement = evaluatePlayerPlacement({
            roster,
            slots,
            player: replacement,
            targetSlotKey: 'SS:0',
            salaryUsed: aiPlayer.salary ?? 0,
            salaryCap: 80000,
            playerById: (id) => (id === aiPlayer.id ? aiPlayer : undefined),
        })

        expect(placement).toMatchObject({
            allowed: true,
            slot: { id: 'SS:0' },
            replacedPlayerId: aiPlayer.id,
        })
    })

    it('rerunning AI never duplicates an already rostered player', () => {
        const roster = emptyRoster()
        roster['OF:0'] = 301
        const existing = player(301, 'OF')

        const result = mergeAutofillPicks({
            roster,
            picks: [{ slotId: 'OF:0', externalPlayerId: existing.id }],
            playersById: new Map([[existing.id, existing]]),
            slots,
        })

        expect(Object.values(result.roster).filter((id) => id === existing.id)).toHaveLength(1)
        expect(result.assignedPicks).toEqual([])
    })

    it('keeps other slots editable when one AI pick cannot be resolved', () => {
        const catcher = player(401, 'C')
        const result = mergeAutofillPicks({
            roster: emptyRoster(),
            picks: [
                { slotId: 'C:0', externalPlayerId: catcher.id },
                { slotId: 'P:0', externalPlayerId: 402 },
            ],
            playersById: new Map([[catcher.id, catcher]]),
            slots,
        })

        expect(result.roster['C:0']).toBe(catcher.id)
        expect(result.roster['P:0']).toBeNull()
        expect(findRosterSlotForPlayer(result.roster, player(403, 'P'), null, slots)?.id).toBe('P:0')
    })

    it('enforces the salary cap after subtracting the replaced player salary', () => {
        const roster = emptyRoster()
        const current = { ...player(501, 'C'), salary: 4000 }
        const affordable = { ...player(502, 'C'), salary: 6000 }
        const tooExpensive = { ...player(503, 'C'), salary: 9000 }
        roster['C:0'] = current.id
        const playerById = (id: number) => (id === current.id ? current : undefined)

        expect(
            evaluatePlayerPlacement({
                roster,
                slots,
                player: affordable,
                targetSlotKey: 'C:0',
                salaryUsed: 78000,
                salaryCap: 80000,
                playerById,
            }).allowed,
        ).toBe(true)
        expect(
            evaluatePlayerPlacement({
                roster,
                slots,
                player: tooExpensive,
                targetSlotKey: 'C:0',
                salaryUsed: 78000,
                salaryCap: 80000,
                playerById,
            }),
        ).toEqual({ allowed: false, reason: 'over-budget' })
    })

    it('has no budget limit when the cap is null, and prefers an exact slot over UTIL', () => {
        const custom = buildSlots([{ slot: 'UTIL', count: 1 }, { slot: '1B', count: 1 }])
        const roster = createEmptyRoster(custom)
        const first = player(601, '1B')

        const placement = evaluatePlayerPlacement({
            roster,
            slots: custom,
            player: first,
            targetSlotKey: null,
            salaryUsed: 999999,
            salaryCap: null,
            playerById: () => undefined,
        })

        expect(placement).toMatchObject({ allowed: true, slot: { id: '1B:0' } })
    })

    it('remapRoster keeps players whose slot survives and reports the rest', () => {
        const roster = emptyRoster()
        roster['SS:0'] = 1
        roster['OF:2'] = 2

        const result = remapRoster(roster, buildSlots([{ slot: 'SS', count: 1 }, { slot: 'OF', count: 2 }]))

        expect(result.roster['SS:0']).toBe(1)
        expect(result.droppedPlayerIds).toEqual([2])
    })
})
