import type { Standings } from '@/shared/stats'

export interface IStandingsService {
    getStandings(slug: string): Promise<Standings>
}
