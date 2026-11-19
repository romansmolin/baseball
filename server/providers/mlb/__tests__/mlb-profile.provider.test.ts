import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MlbSportsProvider } from '../mlb.provider'

import ohtani from './fixtures/ohtani-2025-profile.json'
import schedule from './fixtures/schedule-contexts.json'

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
