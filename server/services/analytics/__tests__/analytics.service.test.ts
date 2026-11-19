import { describe, expect, it, vi } from 'vitest'

import type { ProviderExpectedStats } from '../../../providers/dto/provider-expected-stats.dto'
import type {
    ProviderGameLogLine,
    ProviderPlayerProfile,
} from '../../../providers/dto/provider-player-profile.dto'
import { mapMlbPersonToProfile } from '../../../providers/mlb/mappers/mlb-profile.mapper'
import type { MlbRawPeopleResponse } from '../../../providers/mlb/types/mlb-person.raw'
import ohtani from '../../../providers/mlb/__tests__/fixtures/ohtani-2025-profile.json'
import type { ISportsProvider } from '../../../providers/sports-provider.interface'
import { AnalyticsService } from '../analytics.service'

const ohtaniProfile = mapMlbPersonToProfile((ohtani as unknown as MlbRawPeopleResponse).people[0])

const profileFor = (id: number, overrides: Partial<ProviderPlayerProfile> = {}): ProviderPlayerProfile => ({
    ...ohtaniProfile,
    player: { ...ohtaniProfile.player, id },
    ...overrides,
})

const expectedRow = (id: number, role: 'batter' | 'pitcher' = 'batter'): ProviderExpectedStats => ({
    externalPlayerId: id,
    season: 2025,
    role,
    xba: 0.3,
    xslg: 0.55,
    xwoba: 0.4,
    barrelRate: 15,
    hardHitRate: 50,
    sprintSpeed: 28,
})

const provider = (profiles: Record<number, ProviderPlayerProfile | null>): ISportsProvider =>
    ({
        name: 'fake',
        getPlayerProfile: vi.fn(async (id: number) => profiles[id] ?? null),
    }) as unknown as ISportsProvider

const noExpected = vi.fn().mockResolvedValue([])

const gameLog = (count: number): ProviderGameLogLine[] =>
    Array.from({ length: count }, (_, i) => ({
        date: `2025-06-${String(i + 1).padStart(2, '0')}`,
        opponentTeamId: 2,
        stats: { atBats: 4, hits: 1, baseOnBalls: 0, hitByPitch: 0, sacFlies: 0, totalBases: 2 },
    }))

describe('AnalyticsService.getPlayerAnalytics', () => {
    it('returns null for a player MLB does not know', async () => {
        const service = new AnalyticsService(provider({}), noExpected)

        await expect(service.getPlayerAnalytics(1, 2025)).resolves.toBeNull()
    })

    it('gives a null outlook score for a player without stats', async () => {
        const empty = profileFor(5, { hitting: null, pitching: null })
        const service = new AnalyticsService(provider({ 5: empty }), noExpected)

        const analytics = await service.getPlayerAnalytics(5, 2025)

        expect(analytics?.outlook.score).toBeNull()
        expect(analytics?.hitting).toBeNull()
        expect(analytics?.pitching).toBeNull()
    })

    it('keeps both the hitting and the pitching analytics of a two-way player', async () => {
        const service = new AnalyticsService(provider({ 660271: ohtaniProfile }), noExpected)

        const analytics = await service.getPlayerAnalytics(660271, 2025)

        expect(analytics?.hitting?.season?.homeRuns).toBeGreaterThan(0)
        expect(analytics?.pitching?.season?.strikeOuts).toBeGreaterThan(0)
        expect(analytics?.hitting?.splits.map((s) => s.key).sort()).toEqual(['away', 'home', 'vsLeft', 'vsRight'])
    })

    it('has expected stats null when Savant has no row for the player', async () => {
        const loadExpected = vi.fn().mockResolvedValue([expectedRow(999)])
        const service = new AnalyticsService(provider({ 660271: ohtaniProfile }), loadExpected)

        const analytics = await service.getPlayerAnalytics(660271, 2025)

        expect(analytics?.expected).toBeNull()
    })

    it('has expected stats null, not an error, when Savant is down', async () => {
        const loadExpected = vi.fn().mockRejectedValue(new Error('savant down'))
        const service = new AnalyticsService(provider({ 660271: ohtaniProfile }), loadExpected)

        const analytics = await service.getPlayerAnalytics(660271, 2025)

        expect(analytics?.expected).toBeNull()
        expect(analytics?.outlook.score).not.toBeNull()
    })

    it('attaches the Savant row when there is one', async () => {
        const loadExpected = vi.fn().mockResolvedValue([expectedRow(660271)])
        const service = new AnalyticsService(provider({ 660271: ohtaniProfile }), loadExpected)

        const analytics = await service.getPlayerAnalytics(660271, 2025)

        expect(analytics?.expected).toEqual({
            xba: 0.3, xslg: 0.55, xwoba: 0.4, barrelRate: 15, hardHitRate: 50, sprintSpeed: 28,
        })
    })

    it('builds 7, 14 and 30 game form windows, holding fewer games when the log is short', async () => {
        const hitter = profileFor(7, {
            hitting: { season: { ops: '.750', plateAppearances: 500 }, sabermetrics: null, splits: [], gameLog: gameLog(20) },
            pitching: null,
        })
        const service = new AnalyticsService(provider({ 7: hitter }), noExpected)

        const analytics = await service.getPlayerAnalytics(7, 2025)

        expect(analytics?.hitting?.form.map((w) => w.games)).toEqual([7, 14, 20])
    })
})

describe('AnalyticsService.comparePlayers', () => {
    it('keeps the requested order and reports unknown ids', async () => {
        const service = new AnalyticsService(
            provider({ 1: profileFor(1), 3: profileFor(3) }),
            noExpected,
        )

        const result = await service.comparePlayers([3, 2, 1], 2025)

        expect(result.players.map((p) => p.player.id)).toEqual([3, 1])
        expect(result.missingIds).toEqual([2])
    })

    it('loads each Savant leaderboard once however many players are compared', async () => {
        const loadExpected = vi.fn().mockResolvedValue([])
        const service = new AnalyticsService(
            provider({ 1: profileFor(1), 2: profileFor(2), 3: profileFor(3) }),
            loadExpected,
        )

        await service.comparePlayers([1, 2, 3], 2025)

        const roles = loadExpected.mock.calls.map((call) => call[1])
        expect(new Set(roles).size).toBe(roles.length)
    })
})
