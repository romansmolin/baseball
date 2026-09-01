import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FIELD_SLOTS, type PoolPlayer, type Roster } from '@/shared/team-builder'

import {
    evaluatePlayerPlacement,
    mergeAutofillPicks,
} from '../../model/team-builder-roster'
import { PlayerPoolRow } from '../player-pool-row'

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
    leagueColor: '#3b82f6',
    salary: 5000,
    proj: 10,
    photoUrl: null,
})

describe('team-builder manual UI after AI generation', () => {
    it('renders an enabled Add action for a slot left open by partial AI', () => {
        const catcher = player(601, 'C')
        const pitcher = player(602, 'P')
        const result = mergeAutofillPicks({
            roster: emptyRoster(),
            picks: [
                { slotKey: 'C', externalPlayerId: catcher.id },
                { slotKey: 'P', externalPlayerId: 999 },
            ],
            playersById: new Map([[catcher.id, catcher]]),
        })
        const placement = evaluatePlayerPlacement({
            roster: result.roster,
            player: pitcher,
            targetSlotKey: 'P',
            salaryUsed: catcher.salary,
            salaryCap: 80000,
            playerById: (id) => (id === catcher.id ? catcher : undefined),
        })

        const html = renderToStaticMarkup(
            <PlayerPoolRow player={pitcher} placement={placement} onAdd={() => {}} />,
        )

        expect(html).toContain('>Add</button>')
        expect(html).not.toContain('disabled=""')
    })

    it('renders an enabled Replace action for an AI-selected player', () => {
        const aiShortstop = player(701, 'SS')
        const replacement = player(702, 'SS')
        const result = mergeAutofillPicks({
            roster: emptyRoster(),
            picks: [{ slotKey: 'SS', externalPlayerId: aiShortstop.id }],
            playersById: new Map([[aiShortstop.id, aiShortstop]]),
        })
        const placement = evaluatePlayerPlacement({
            roster: result.roster,
            player: replacement,
            targetSlotKey: 'SS',
            salaryUsed: aiShortstop.salary,
            salaryCap: 80000,
            playerById: (id) =>
                id === aiShortstop.id ? aiShortstop : undefined,
        })

        const html = renderToStaticMarkup(
            <PlayerPoolRow
                player={replacement}
                placement={placement}
                onAdd={() => {}}
            />,
        )

        expect(html).toContain('>Replace</button>')
        expect(html).not.toContain('disabled=""')
    })
})
