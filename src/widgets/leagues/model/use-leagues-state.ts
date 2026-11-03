'use client'

import { useCallback, useMemo, useState } from 'react'

import {
    PRODUCT_BASEBALL_LEAGUES,
    UNBACKED_BASEBALL_LEAGUES,
    type BaseballLeagueRegion,
} from '@/shared/baseball'
import { useTournamentsData } from '@/entities/tournaments'

import { filterLeagues, sortLeagues } from './league-filters'
import type { League, LeagueFormat, Region, RegionFilter, SortKey } from './league.type'

export interface LeaguesState {
    leagues: League[]
    visibleLeagues: League[]
    totalLeagues: number
    liveLeagues: number
    search: string
    region: RegionFilter
    liveOnly: boolean
    sortKey: SortKey
    selectedLeagueSlug: string | null
    selectedLeague: League | null
    setSearch: (q: string) => void
    setRegion: (region: RegionFilter) => void
    setLiveOnly: (live: boolean) => void
    setSortKey: (sort: SortKey) => void
    setSelectedLeagueSlug: (slug: string | null) => void
    clearFilters: () => void
}

const REGION_COUNTRY: Record<BaseballLeagueRegion, string> = {
    'north-america': 'USA / Canada',
    'japan-korea': 'Japan / South Korea',
    'latin-america': 'Latin America',
}

const DESCRIPTIONS: Record<string, string> = {
    mlb: 'The premier professional league. Deepest player pool and the biggest tournament prize pools on the platform.',
    'triple-a': 'One step from the majors. Polished prospects and veteran depth — real box scores, real scoring.',
    'double-a': 'Where top prospects break out. High-variance slates that reward sharp research.',
    'high-a': 'Full-season A-ball. Younger rosters, live schedules, and a growing tournament calendar.',
    'single-a': 'Early-career pro ball. Prospect-heavy pools for managers who like to draft on upside.',
    rookie: 'Complex and rookie-level ball. Rosters churn fast and box-score coverage is partial.',
    npb: 'Not yet available for contests. Provider coverage and data-use rights still need confirmation.',
    kbo: 'Not yet available for contests. A complete approved schedule, roster and scoring source is still needed.',
}

const DEFAULT_FORMATS: LeagueFormat[] = ['Daily', 'Weekly', 'Tournament']

interface TournamentAgg {
    count: number
    prizeCredits: number
}

function formatPrize(credits: number): string {
    if (credits <= 0) return '—'
    if (credits >= 1000) return `${(credits / 1000).toFixed(1)}k cr`
    return `${credits} cr`
}

export const useLeaguesState = (): LeaguesState => {
    const [search, setSearch] = useState('')
    const [region, setRegion] = useState<RegionFilter>('all')
    const [liveOnly, setLiveOnly] = useState(false)
    const [sortKey, setSortKey] = useState<SortKey>('tournaments')
    const [selectedLeagueSlug, setSelectedLeagueSlug] = useState<string | null>(null)

    // Real, current tournament counts + prize pools per league.
    const { data: tournamentsList } = useTournamentsData({ visibility: ['PUBLIC'] })

    const aggByLeague = useMemo(() => {
        const map = new Map<string, TournamentAgg>()
        for (const t of tournamentsList?.items ?? []) {
            const agg = map.get(t.leagueSlug) ?? { count: 0, prizeCredits: 0 }
            agg.count += 1
            agg.prizeCredits += t.prizePoolCredits
            map.set(t.leagueSlug, agg)
        }
        return map
    }, [tournamentsList])

    const leagues = useMemo<League[]>(() => {
        const backed: League[] = PRODUCT_BASEBALL_LEAGUES.map((l) => {
            const agg = aggByLeague.get(l.slug)
            return {
                slug: l.slug,
                name: l.name,
                full: l.fullName,
                region: l.region as Region,
                color: l.color,
                country: REGION_COUNTRY[l.region],
                proTeams: l.proTeams,
                season: 'live',
                providerBacked: true,
                myTeams: 0,
                openTournaments: agg?.count ?? 0,
                prizePool: formatPrize(agg?.prizeCredits ?? 0),
                formats: DEFAULT_FORMATS,
                topScorer: '—',
                topPoints: 0,
                description: DESCRIPTIONS[l.slug] ?? '',
            }
        })

        const unbacked: League[] = UNBACKED_BASEBALL_LEAGUES.map((l) => ({
            slug: l.slug,
            name: l.name,
            full: l.fullName,
            region: l.region as Region,
            color: l.color,
            country: REGION_COUNTRY[l.region],
            proTeams: l.proTeams,
            season: 'offseason',
            providerBacked: false,
            myTeams: 0,
            openTournaments: 0,
            prizePool: '—',
            formats: DEFAULT_FORMATS,
            topScorer: '—',
            topPoints: 0,
            description: DESCRIPTIONS[l.slug] ?? '',
        }))

        return [...backed, ...unbacked]
    }, [aggByLeague])

    const visibleLeagues = useMemo(
        () => sortLeagues(filterLeagues(leagues, { search, region, liveOnly }), sortKey),
        [leagues, search, region, liveOnly, sortKey],
    )

    const selectedLeague = useMemo(
        () => leagues.find((l) => l.slug === selectedLeagueSlug) ?? null,
        [leagues, selectedLeagueSlug],
    )

    const liveLeagues = useMemo(
        () => leagues.filter((l) => l.providerBacked).length,
        [leagues],
    )

    const clearFilters = useCallback(() => {
        setSearch('')
        setRegion('all')
        setLiveOnly(false)
        setSortKey('tournaments')
    }, [])

    return {
        leagues,
        visibleLeagues,
        totalLeagues: leagues.length,
        liveLeagues,
        search,
        region,
        liveOnly,
        sortKey,
        selectedLeagueSlug,
        selectedLeague,
        setSearch,
        setRegion,
        setLiveOnly,
        setSortKey,
        setSelectedLeagueSlug,
        clearFilters,
    }
}
