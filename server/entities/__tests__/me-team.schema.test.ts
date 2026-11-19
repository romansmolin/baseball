import { describe, expect, it } from 'vitest'

import { createTeamSchema } from '../me/create-team.schema'
import { updateLineupSchema } from '../me/update-lineup.schema'

const player = {
    externalPlayerId: 660271,
    slotKey: 'SS:0',
    position: 'SS',
    name: 'Test Player',
    teamName: 'Test Team',
    salaryAtLock: 5000,
}

const baseTeam = { name: 'My team', leagueSlug: 'mlb', players: [player] }

describe('createTeamSchema', () => {
    it('defaults the platform to OTHER and the format to H2H Points with no cap', () => {
        const parsed = createTeamSchema.parse(baseTeam)

        expect(parsed.platform).toBe('OTHER')
        expect(parsed.format).toBe('H2H_POINTS')
        expect(parsed.forecastPeriod).toBe('WEEK')
        expect(parsed.salaryCap).toBeNull()
    })

    it('accepts a draft with no players', () => {
        expect(createTeamSchema.safeParse({ ...baseTeam, players: [] }).success).toBe(true)
    })

    it('rejects an unknown platform and a malformed slot id', () => {
        expect(createTeamSchema.safeParse({ ...baseTeam, platform: 'FANDUEL' }).success).toBe(false)
        expect(
            createTeamSchema.safeParse({ ...baseTeam, players: [{ ...player, slotKey: 'LF' }] }).success,
        ).toBe(false)
    })
})

describe('categories', () => {
    it('rejects an empty or repeated category list', () => {
        expect(createTeamSchema.safeParse({ ...baseTeam, categories: [] }).success).toBe(false)
        expect(createTeamSchema.safeParse({ ...baseTeam, categories: ['HR', 'HR'] }).success).toBe(false)
        expect(createTeamSchema.safeParse({ ...baseTeam, categories: ['HR', 'SB'] }).success).toBe(true)
    })
})

describe('updateLineupSchema', () => {
    it('leaves settings undefined when they are not sent, so a save never resets them', () => {
        const parsed = updateLineupSchema.parse({ players: [player] })

        expect(parsed.platform).toBeUndefined()
        expect(parsed.format).toBeUndefined()
        expect(parsed.scoringRules).toBeUndefined()
        expect(parsed.slotConfig).toBeUndefined()
    })
})
