import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MlbSportsProvider } from '../mlb.provider'

import ohtani from './fixtures/ohtani-2025-profile.json'
import schedule from './fixtures/schedule-contexts.json'
import standings from './fixtures/standings.json'

const fetchedUrls: string[] = []

const json = (body: unknown): Response =>
    ({ ok: true, status: 200, statusText: 'OK', json: async () => body }) as unknown as Response
const notFound = (): Response =>
    ({ ok: false, status: 404, statusText: 'Not Found', json: async () => ({}) }) as unknown as Response

beforeEach(() => {
    fetchedUrls.length = 0
})
afterEach(() => vi.unstubAllGlobals())

describe('MlbSportsProvider.getPlayerProfile', () => {
    it('asks for splits, game log, sabermetrics and roster status for the season', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string) => {
                fetchedUrls.push(url)
                return url.includes('/teams?') ? json({ teams: [] }) : json(ohtani)
            }),
        )

        const profile = await new MlbSportsProvider().getPlayerProfile(660271, 2025)

        const profileUrl = fetchedUrls.find((u) => u.includes('/people/660271'))
        expect(profileUrl).toContain('rosterEntries')
        expect(profileUrl).toContain('sitCodes=[vl,vr,h,a]')
        expect(profileUrl).toContain('season=2025')
        expect(profile?.hitting).not.toBeNull()
        expect(profile?.pitching).not.toBeNull()
    })

    it('returns null when MLB does not know the player', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => notFound()))

        await expect(new MlbSportsProvider().getPlayerProfile(1, 2025)).resolves.toBeNull()
    })
})

describe('MlbSportsProvider.getGameContexts', () => {
    it('hydrates the probable pitchers and attaches them to their games', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string) => {
                fetchedUrls.push(url)
                if (url.includes('/schedule')) return json(schedule)
                if (url.includes('/people?personIds=')) {
                    return json({
                        people: [{ id: 592332, fullName: 'Kevin Gausman', primaryPosition: { abbreviation: 'SP' }, pitchHand: { code: 'R' } }],
                    })
                }
                return json({})
            }),
        )

        const contexts = await new MlbSportsProvider().getGameContexts({
            startDateUtc: new Date('2025-07-01T00:00:00Z'),
            endDateUtc: new Date('2025-07-01T00:00:00Z'),
        })

        const scheduleUrl = fetchedUrls.find((u) => u.includes('/schedule'))
        expect(scheduleUrl).toContain('hydrate=probablePitcher,weather,venue,lineups')
        expect(contexts).toHaveLength(2)
        expect(contexts[0].probablePitchers.home?.throws).toBe('R')
        expect(contexts[1].probablePitchers.home).toBeNull()
    })
})

describe('MlbSportsProvider.getGameContext', () => {
    it('fetches a single game by gamePk and returns its context', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string) => {
                fetchedUrls.push(url)
                return url.includes('/schedule') ? json({ dates: [{ games: [(schedule as { dates: { games: unknown[] }[] }).dates[0].games[0]] }] }) : json({ people: [] })
            }),
        )

        const context = await new MlbSportsProvider().getGameContext(777283)

        expect(fetchedUrls.find((u) => u.includes('/schedule'))).toContain('gamePks=777283')
        expect(context?.game.gamePk).toBe(777283)
    })

    it('returns null when the schedule has no such game', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => json({ dates: [] })))

        await expect(new MlbSportsProvider().getGameContext(1)).resolves.toBeNull()
    })
})

describe('MlbSportsProvider.getGameContexts pitcher stats', () => {
    it('asks for the pitchers season line so ERA and innings are available', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string) => {
                fetchedUrls.push(url)
                if (url.includes('/schedule')) return json(schedule)
                return json({
                    people: [
                        {
                            id: 592332,
                            fullName: 'Kevin Gausman',
                            pitchHand: { code: 'R' },
                            stats: [{ group: { displayName: 'pitching' }, splits: [{ stat: { era: '3.12', inningsPitched: '120.1' } }] }],
                        },
                    ],
                })
            }),
        )

        const [context] = await new MlbSportsProvider().getGameContexts({
            startDateUtc: new Date('2025-07-01T00:00:00Z'),
            endDateUtc: new Date('2025-07-01T00:00:00Z'),
            season: 2025,
        })

        expect(fetchedUrls.find((u) => u.includes('/people?'))).toContain('stats(group=[pitching]')
        expect(context.probablePitchers.home?.pitchingStats).toEqual({ era: '3.12', inningsPitched: '120.1' })
    })
})

describe('MlbSportsProvider.getTeamStandings', () => {
    it('maps wins, losses and the last-ten record per team', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string) => {
                fetchedUrls.push(url)
                return json(standings)
            }),
        )

        const rows = await new MlbSportsProvider().getTeamStandings(2025)

        expect(fetchedUrls[0]).toContain('/standings?leagueId=103,104&season=2025')
        expect(rows).toHaveLength(2)
        expect(rows[0]).toEqual({
            teamId: expect.any(Number),
            wins: expect.any(Number),
            losses: expect.any(Number),
            lastTen: { wins: expect.any(Number), losses: expect.any(Number) },
        })
    })
})
