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

it('uses the completed occurrence when a postponed game is rescheduled under the same id', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('/schedule')
        ? jsonResponse({ dates: [{ date: '2025-07-02', games: [{ gamePk: 777284, status: { detailedState: 'Postponed', abstractGameState: 'Final' } }] }, { date: '2025-07-03', games: [{ gamePk: 777284, status: { detailedState: 'Final', abstractGameState: 'Final' } }] }] })
        : jsonResponse({ teams: { home: { team: { id: 1 }, players: {} }, away: { team: { id: 2 }, players: {} } } })))
    expect((await new MlbSportsProvider().getBoxScore(777284))?.status).toBe('FINAL')
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('MlbSportsProvider — league awareness', () => {
    const provider = new MlbSportsProvider()

    it('treats an omitted roster from the real upstream response as unavailable', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ teamId: 687, rosterType: 'active', link: '/api/v1/teams/687/roster' })))
        await expect(provider.getPlayersByTeam(687, { league: 'winter-leagues', season: 2026 })).resolves.toEqual([])
    })

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

    it('caps player pages at ten and batches season stats only for each page', async () => {
        const people = Array.from({ length: 12 }, (_, index) => ({
            id: 910000 + index,
            fullName: `Player ${String(index).padStart(2, '0')}`,
            primaryPosition: { abbreviation: 'SP' },
            active: true,
        }))
        const statsRequests: URL[] = []
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            fetchedUrls.push(url)
            const parsed = new URL(url)
            if (parsed.pathname.endsWith('/sports/1/players')) {
                return jsonResponse({ people })
            }
            if (parsed.pathname.endsWith('/teams')) return jsonResponse({ teams: [] })
            if (parsed.pathname.endsWith('/people')) {
                statsRequests.push(parsed)
                const ids = (parsed.searchParams.get('personIds') ?? '').split(',').map(Number)
                return jsonResponse({
                    people: ids.map((id) => id === 910001 ? ({ id }) : ({
                        id,
                        stats: [
                            { group: { displayName: 'hitting' }, splits: [{ stat: { avg: '.275', homeRuns: 4, rbi: 12 } }] },
                            { group: { displayName: 'pitching' }, splits: [{ stat: { era: '2.50', wins: 2, strikeOuts: 18 } }] },
                        ],
                    })),
                })
            }
            return jsonResponse({})
        }))

        const firstPage = await provider.getPlayers({ season: 2026, limit: 100, offset: 0 })
        const secondPage = await provider.getPlayers({ season: 2026, limit: 10, offset: 10 })

        expect(firstPage.items).toHaveLength(10)
        expect(secondPage.items).toHaveLength(2)
        expect(firstPage.items.map((player) => player.id)).not.toEqual(
            expect.arrayContaining(secondPage.items.map((player) => player.id)),
        )
        expect(firstPage.items[0]).toMatchObject({
            statsSeason: 2026,
            battingStats: { avg: '.275', homeRuns: 4, rbi: 12 },
            pitchingStats: { era: '2.50', wins: 2, strikeOuts: 18 },
        })
        expect(firstPage.items[1].battingStats).toBeUndefined()
        expect(firstPage.items[1].pitchingStats).toBeUndefined()
        expect(statsRequests).toHaveLength(2)
        expect(statsRequests[0].searchParams.get('personIds')?.split(',')).toHaveLength(10)
        expect(statsRequests[1].searchParams.get('personIds')?.split(',')).toHaveLength(2)
        expect(statsRequests[0].searchParams.get('personIds')?.split(',').map(Number)).toEqual(
            firstPage.items.map((player) => player.id),
        )
        expect(statsRequests[0].searchParams.get('hydrate')).toContain('season=2026')
    })

    it('applies position and availability filters before computing a page', async () => {
        const people = Array.from({ length: 12 }, (_, index) => ({
            id: 920000 + index,
            fullName: `Player ${String(index).padStart(2, '0')}`,
            primaryPosition: { abbreviation: index % 2 === 0 ? 'SP' : '1B' },
            active: index % 2 === 0,
        }))
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            fetchedUrls.push(url)
            const parsed = new URL(url)
            if (parsed.pathname.endsWith('/sports/1/players')) return jsonResponse({ people })
            if (parsed.pathname.endsWith('/teams')) return jsonResponse({ teams: [] })
            if (parsed.pathname.endsWith('/people')) {
                const ids = (parsed.searchParams.get('personIds') ?? '').split(',').map(Number)
                return jsonResponse({ people: ids.map((id) => ({ id })) })
            }
            return jsonResponse({})
        }))

        const page = await provider.getPlayers({
            season: 2026,
            positionGroup: 'P',
            active: true,
            limit: 2,
            offset: 1,
        })

        expect(page.total).toBe(6)
        expect(page.items.map((player) => player.id)).toEqual([920002, 920004])
    })
})
