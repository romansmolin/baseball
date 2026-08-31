import { describe, expect, it } from 'vitest'

import { baseballLeagueEnum } from '../baseball-league.schema'
import { listPlayersQuerySchema } from '../players/players.schema'
import { listTeamsQuerySchema } from '../teams/teams.schema'

describe('baseball league query validation', () => {
    it('accepts every supported league slug', () => {
        for (const slug of ['mlb', 'triple-a', 'double-a', 'high-a', 'single-a', 'rookie']) {
            expect(baseballLeagueEnum.safeParse(slug).success).toBe(true)
        }
    })

    it('rejects an unsupported league rather than falling back to MLB', () => {
        expect(baseballLeagueEnum.safeParse('npb').success).toBe(false)
        expect(baseballLeagueEnum.safeParse('kbo').success).toBe(false)
        expect(baseballLeagueEnum.safeParse('').success).toBe(false)
    })

    it('the players query rejects ?league=npb', () => {
        expect(listPlayersQuerySchema.safeParse({ league: 'npb' }).success).toBe(false)
        expect(listPlayersQuerySchema.safeParse({ league: 'triple-a' }).success).toBe(true)
        // league is optional — omitting it is valid (server defaults to MLB)
        expect(listPlayersQuerySchema.safeParse({}).success).toBe(true)
    })

    it('the teams query rejects ?league=npb', () => {
        expect(listTeamsQuerySchema.safeParse({ league: 'npb' }).success).toBe(false)
        expect(listTeamsQuerySchema.safeParse({ league: 'double-a' }).success).toBe(true)
    })
})
