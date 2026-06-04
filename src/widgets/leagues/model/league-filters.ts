import type { League, RegionFilter, SortKey } from './league.type'

interface FilterArgs {
    search: string
    region: RegionFilter
    liveOnly: boolean
}

const prizeAmount = (prize: string) => {
    if (prize === '—') return 0
    return parseFloat(prize.replace(/[^0-9.]/g, ''))
}

export const filterLeagues = (leagues: League[], { search, region, liveOnly }: FilterArgs): League[] => {
    const q = search.trim().toLowerCase()
    return leagues.filter((league) => {
        if (region !== 'all' && league.region !== region) return false
        if (liveOnly && league.season !== 'live') return false
        if (q) {
            const haystack = `${league.name} ${league.full} ${league.country}`.toLowerCase()
            if (!haystack.includes(q)) return false
        }
        return true
    })
}

export const sortLeagues = (leagues: League[], sort: SortKey): League[] => {
    const out = [...leagues]
    switch (sort) {
        case 'name':
            return out.sort((a, b) => a.full.localeCompare(b.full))
        case 'teams':
            return out.sort((a, b) => b.myTeams - a.myTeams)
        case 'prize':
            return out.sort((a, b) => prizeAmount(b.prizePool) - prizeAmount(a.prizePool))
        case 'tournaments':
            return out.sort((a, b) => b.openTournaments - a.openTournaments)
    }
}
