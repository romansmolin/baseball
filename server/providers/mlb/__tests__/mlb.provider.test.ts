import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MlbSportsProvider } from '../mlb.provider'

// Captures every URL the provider fetches and returns a canned payload chosen
// by path, so we can assert the `sportId` the provider puts on the wire.
const fetchedUrls: string[] = []

function jsonResponse(body: unknown): Response {
    return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => body,
    } as unknown as Response
}

function mockFetch(url: string): Response {
    fetchedUrls.push(url)
    if (url.includes('/sports/') && url.includes('/players')) {
        return jsonResponse({
            people: [
                {
                    id: 700001,
                    fullName: 'Prospect One',
                    firstName: 'Prospect',
                    lastName: 'One',
                    primaryPosition: { abbreviation: 'SS' },
                    currentTeam: { id: 5000, name: 'Test Sox' },
                    active: true,
                },
            ],
        })
    }
    if (url.includes('/teams')) {
        return jsonResponse({
            teams: [
                {
                    id: 5000,
                    name: 'Test Sox',
                    abbreviation: 'TSX',
                    locationName: 'Testville',
                    teamName: 'Sox',
                    league: { name: 'International League' },
                    division: { name: 'West' },
                    venue: { name: 'Test Park' },
                    active: true,
                },
            ],
        })
    }
    if (url.includes('/schedule')) {
        return jsonResponse({ dates: [] })
    }
    if (url.includes('/people?personIds=')) {
        return jsonResponse({
            people: [
                {
                    id: 111,
                    fullName: 'Traded Slugger',
                    primaryPosition: { abbreviation: '1B' },
                    currentTeam: { id: 5001, name: 'New Team' },
                    active: true,
                },
                {
                    id: 222,
                    fullName: 'Stable Ace',
                    primaryPosition: { abbreviation: 'SP' },
                    currentTeam: { id: 5000, name: 'Test Sox' },
                    active: true,
                },
            ],
        })
    }
    return jsonResponse({})
}

beforeEach(() => {
    fetchedUrls.length = 0
    vi.stubGlobal(
        'fetch',
        vi.fn((url: string) => Promise.resolve(mockFetch(url))),
    )
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('MlbSportsProvider — league awareness', () => {
    const provider = new MlbSportsProvider()

    it('defaults to sportId 1 (MLB) when no league is passed', async () => {
        await provider.getTeams({ season: 2026 })
        expect(fetchedUrls[0]).toContain('sportId=1')
        expect(fetchedUrls[0]).not.toContain('sportId=11')
    })

    it('uses the Triple-A sportId for getTeams', async () => {
        await provider.getTeams({ league: 'triple-a', season: 2026 })
        expect(fetchedUrls[0]).toContain('sportId=11')
    })

    it('uses the Double-A sportId path segment for getPlayers', async () => {
        await provider.getPlayers({ league: 'double-a', season: 2026 })
        expect(fetchedUrls.some((u) => u.includes('/sports/12/players'))).toBe(true)
    })

    it('uses the High-A sportId for getSchedule', async () => {
        await provider.getSchedule({
            league: 'high-a',
            season: 2026,
            startDateUtc: new Date('2026-05-01T00:00:00Z'),
            endDateUtc: new Date('2026-05-07T00:00:00Z'),
        })
        expect(fetchedUrls[0]).toContain('sportId=13')
        expect(fetchedUrls[0]).not.toContain('teamId=')
    })

    it('scopes getSchedule to a teamId list when given teamIds', async () => {
        await provider.getSchedule({
            league: 'mlb',
            season: 2026,
            startDateUtc: new Date('2026-05-01T00:00:00Z'),
            endDateUtc: new Date('2026-05-07T00:00:00Z'),
            teamIds: [119, 147, 119],
        })
        expect(fetchedUrls[0]).toContain('teamId=119,147')
    })

    it('maps a MiLB team response to the provider-agnostic DTO', async () => {
        const teams = await provider.getTeams({ league: 'triple-a', season: 2026 })
        expect(teams).toEqual([
            {
                id: 5000,
                name: 'Test Sox',
                abbreviation: 'TSX',
                locationName: 'Testville',
                teamName: 'Sox',
                league: 'International League',
                division: 'West',
                venueName: 'Test Park',
                active: true,
            },
        ])
    })

    it('bulk-resolves players by id to their current team via /people', async () => {
        const players = await provider.getPlayersByIds([111, 222])
        expect(fetchedUrls[0]).toContain('/people?personIds=111,222')
        expect(fetchedUrls[0]).toContain('hydrate=currentTeam')
        expect(players.map((p) => [p.id, p.teamId])).toEqual([
            [111, 5001],
            [222, 5000],
        ])
    })

    it('returns [] for getPlayersByIds with no ids and makes no request', async () => {
        const players = await provider.getPlayersByIds([])
        expect(players).toEqual([])
        expect(fetchedUrls).toHaveLength(0)
    })

    it('maps a MiLB player from a different sport level onto ProviderPlayer', async () => {
        const page = await provider.getPlayers({ league: 'triple-a', season: 2026 })
        expect(page.items[0]).toMatchObject({
            id: 700001,
            fullName: 'Prospect One',
            primaryPosition: 'SS',
            teamName: 'Test Sox',
            teamAbbreviation: 'TSX',
        })
    })
})
