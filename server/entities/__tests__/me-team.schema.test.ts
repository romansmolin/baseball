import { describe, expect, it } from 'vitest'

import { createTeamSchema } from '../me/create-team.schema'
import { updateLineupSchema } from '../me/update-lineup.schema'

const player = {
    externalPlayerId: 660271,
    slotKey: 'SS',
    position: 'SS',
    name: 'Test Player',
    teamName: 'Test Team',
    salaryAtLock: 5000,
}

const baseTeam = { name: 'My team', leagueSlug: 'mlb', players: [player] }

describe('createTeamSchema', () => {
    it('defaults the platform to OTHER and the scoring preset to POINTS', () => {
        const parsed = createTeamSchema.parse(baseTeam)

        expect(parsed.platform).toBe('OTHER')
        expect(parsed.scoringPreset).toBe('POINTS')
    })

    it('accepts a chosen platform and preset', () => {
        const parsed = createTeamSchema.parse({ ...baseTeam, platform: 'YAHOO', scoringPreset: 'CATEGORIES_5X5' })

        expect(parsed.platform).toBe('YAHOO')
        expect(parsed.scoringPreset).toBe('CATEGORIES_5X5')
    })

    it('rejects an unknown platform', () => {
        expect(createTeamSchema.safeParse({ ...baseTeam, platform: 'FANDUEL' }).success).toBe(false)
    })

    it('rejects an unknown scoring preset', () => {
        expect(createTeamSchema.safeParse({ ...baseTeam, scoringPreset: 'ROTO' }).success).toBe(false)
    })
})

describe('updateLineupSchema', () => {
    it('leaves platform and preset undefined when they are not sent, so a save never resets them', () => {
        const parsed = updateLineupSchema.parse({ players: [player] })

        expect(parsed.platform).toBeUndefined()
        expect(parsed.scoringPreset).toBeUndefined()
    })

    it('accepts a new platform and preset', () => {
        const parsed = updateLineupSchema.parse({ players: [player], platform: 'ESPN', scoringPreset: 'POINTS' })

        expect(parsed.platform).toBe('ESPN')
    })
})
