import type { SortKey, StatusFilter, Team } from './team.type'

interface FilterArgs {
    search: string
    leagueSlug: string | null
    status: StatusFilter
    favs: Record<string, boolean>
}

export const filterTeams = (teams: Team[], { search, leagueSlug, status, favs }: FilterArgs): Team[] => {
    const q = search.trim().toLowerCase()
    return teams.filter((team) => {
        if (leagueSlug && team.leagueSlug !== leagueSlug) return false
        if (status === 'active' && team.status !== 'active') return false
        if (status === 'draft' && team.status !== 'draft') return false
        if (status === 'captain' && !team.captain) return false
        if (status === 'favorite' && !favs[team.id]) return false
        if (q && !team.name.toLowerCase().includes(q)) return false
        return true
    })
}

export const sortTeams = (teams: Team[], sort: SortKey): Team[] => {
    const out = [...teams]
    switch (sort) {
        case 'name':
            return out.sort((a, b) => a.name.localeCompare(b.name))
        case 'proj':
            return out.sort((a, b) => b.proj - a.proj)
        case 'best':
            return out.sort((a, b) => b.best - a.best)
        case 'recent':
            return out.sort((a, b) => a.savedDaysAgo - b.savedDaysAgo)
    }
}
