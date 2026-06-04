import type { TopPerformer } from '@/shared/dashboard'
import type { TopPerformersQuery } from '../../../entities/performers/top.schema'

export interface ITopPerformersService {
    listTop(query: TopPerformersQuery): Promise<TopPerformer[]>
}
