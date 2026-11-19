import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DEFAULT_SLOT_CONFIG, buildSlots, type PoolPlayer } from '@/shared/team-builder'

import {
    createEmptyRoster,
    evaluatePlayerPlacement,
    mergeAutofillPicks,
} from '../../model/team-builder-roster'
import { PlayerPoolRow } from '../player-pool-row'

const slots = buildSlots(DEFAULT_SLOT_CONFIG)
const emptyRoster = () => createEmptyRoster(slots)

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
                { slotId: 'C:0', externalPlayerId: catcher.id },
                { slotId: 'P:0', externalPlayerId: 999 },
            ],
            playersById: new Map([[catcher.id, catcher]]),
            slots,
        })
        const placement = evaluatePlayerPlacement({
            roster: result.roster,
            slots,
            player: pitcher,
            targetSlotKey: 'P:0',
            salaryUsed: catcher.salary ?? 0,
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
            picks: [{ slotId: 'SS:0', externalPlayerId: aiShortstop.id }],
            playersById: new Map([[aiShortstop.id, aiShortstop]]),
            slots,
        })
        const placement = evaluatePlayerPlacement({
            roster: result.roster,
            slots,
            player: replacement,
            targetSlotKey: 'SS:0',
            salaryUsed: aiShortstop.salary ?? 0,
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
