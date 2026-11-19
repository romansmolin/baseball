import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DEFAULT_SLOT_CONFIG, buildSlots } from '@/shared/team-builder'

import { AutofillPreviewBar } from '../autofill-preview-bar'
import { FormatPicker } from '../format-picker'

describe('format picker', () => {
    it('shows all four formats, with only H2H Points selectable', () => {
        const html = renderToStaticMarkup(<FormatPicker onChoose={() => {}} />)

        expect(html).toContain('Head-to-Head Points')
        expect(html).toContain('Head-to-Head Categories')
        expect(html).toContain('Rotisserie (Roto)')
        expect(html).toContain('Daily Fantasy (DFS)')
        expect(html.match(/disabled=""/g)).toHaveLength(3)
    })
})

describe('autofill preview bar', () => {
    it('lists picks and the concrete reason a slot stayed open', () => {
        const html = renderToStaticMarkup(
            <AutofillPreviewBar
                slots={buildSlots(DEFAULT_SLOT_CONFIG)}
                preview={{
                    picks: [{ slotId: '1B:0', externalPlayerId: 1, playerName: 'First Baseman', projectedPoints: 15.6, position: '1B', teamName: 'NYY', photoUrl: null }],
                    unfilled: [{ slotId: 'SS:0', code: 'NO_ELIGIBLE_PLAYER', message: 'No available SS in the player pool for SS' }],
                    explanation: 'Best projected points at each slot.',
                    totalPoints: 15.6,
                    basis: 'season-pace',
                }}
                onAccept={() => {}}
                onDiscard={() => {}}
            />,
        )

        expect(html).toContain('First Baseman')
        expect(html).toContain('No available SS in the player pool for SS')
        expect(html).toContain('season-pace estimate')
        expect(html).toContain('>Accept<')
    })
})
