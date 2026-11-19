import { usePlayersData } from '@/entities/players'

// Searches MLB players by name for the compare picker.
export function usePlayerSearch(query: string) {
    const { data, isLoading } = usePlayersData({ league: 'mlb', search: query, limit: 8 })
    return { results: data?.items ?? [], isLoading }
}
