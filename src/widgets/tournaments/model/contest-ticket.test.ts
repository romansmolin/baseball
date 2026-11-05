import { describe, expect, it } from 'vitest'
import type { ContestCatalogItem } from '@/shared/tournaments'
import { contestFormat, contestLength, contestSources, groupTicketsByMonth, ticketDate, ticketTitle } from './contest-ticket'

const item = (over: Partial<ContestCatalogItem>): ContestCatalogItem => ({
    id: 'a', kind: 'SERIES', name: 'Series', leagueSlug: 'north-america', status: 'DRAFTING', templateKey: 'diamond-cup',
    startsAt: '2026-11-04T12:00:00Z', endsAt: '2026-11-18T12:00:00Z', locksAt: '2026-11-04T12:00:00Z',
    memberCount: 0, entryFeeCredits: 0, prizePoolCredits: 0, ...over,
})

describe('contest ticket', () => {
    it('describes format, length and sources in plain words', () => {
        expect([contestFormat(item({})), contestLength(item({}))]).toEqual(['Diamond Cup', '2 weeks'])
        expect([contestFormat(item({ kind: 'DAILY', slateKey: 'weekend' })), contestLength(item({ kind: 'DAILY', slateKey: 'weekend' }))]).toEqual(['Weekend Series', '2 days'])
        expect(contestSources(item({ sourceLeagues: ['mlb', 'triple-a'] }))).toBe('MLB, Triple-A')
        expect(contestSources(item({ leagueSlug: 'winter-leagues' }))).toBe('Winter Leagues')
    })

    it('drops what the ticket already shows from the title', () => {
        expect(ticketTitle(item({ kind: 'DAILY', templateKey: undefined, name: 'Winter Leagues · Tuesday Rally · Nov 3, 2026' }))).toBe('Tuesday Rally')
        expect(ticketTitle(item({ name: 'Diamond Cup · North American Leagues · Mar 24, 2027' }))).toBe('Diamond Cup')
        expect(ticketTitle(item({ kind: 'DAILY', slateKey: 'weekend', templateKey: undefined, name: 'Weekend Series · Winter Leagues · Full Count Weekend · Nov 7, 2026' }))).toBe('Full Count Weekend')
        expect(ticketTitle(item({ kind: 'LEAGUE', templateKey: undefined, name: 'AA Around the Horn Open' }))).toBe('AA Around the Horn Open')
    })

    it('leads with the date that matters for each tab and groups by that month', () => {
        const running = item({ kind: 'LEAGUE', startsAt: '2026-06-29T19:00:00Z', endsAt: '2026-11-24T00:00:00Z', locksAt: null })
        expect(ticketDate(running, 'live')).toEqual({ label: 'Ends', at: running.endsAt })
        expect(ticketDate(item({}), 'open')).toEqual({ label: 'Closes', at: '2026-11-04T12:00:00Z' })
        const groups = groupTicketsByMonth([item({ id: 'nov' }), item({ id: 'nov2' }), item({ id: 'dec', locksAt: '2026-12-02T12:00:00Z' })], 'open')
        expect(groups.map(group => [group.month, group.items.length])).toEqual([['November 2026', 2], ['December 2026', 1]])
    })
})
