import { POSITION_GROUP } from './player.type'
import type { LeagueFilter, Player, PositionFilter, SortKey, StatusFilter } from './player.type'

interface FilterArgs {
    search: string
    position: PositionFilter
    league: LeagueFilter
    status: StatusFilter
}

export const filterPlayers = (
    players: Player[],
    { search, position, league, status }: FilterArgs,
): Player[] => {
    const q = search.trim().toLowerCase()
    return players.filter((player) => {
        if (position !== 'all' && POSITION_GROUP[player.pos] !== position) return false
        if (league !== 'all' && player.leagueSlug !== league) return false
        if (status !== 'all' && player.status !== status) return false
        if (q) {
            const haystack = `${player.name} ${player.team} ${player.pos}`.toLowerCase()
            if (!haystack.includes(q)) return false
        }
        return true
    })
}

export const sortPlayers = (players: Player[], sort: SortKey): Player[] => {
    const out = [...players]
    switch (sort) {
        case 'name':
            return out.sort((a, b) => a.name.localeCompare(b.name))
        case 'avg':
            return out.sort((a, b) => b.avg - a.avg)
        case 'own':
            return out.sort((a, b) => b.own - a.own)
        case 'salary':
            return out.sort((a, b) => b.salary - a.salary)
        case 'proj':
            return out.sort((a, b) => b.proj - a.proj)
    }
}
