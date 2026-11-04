import type { DailyStars } from '@/shared/stats'

export interface IStarsService {
    getStars(limit: number): Promise<DailyStars>
}
