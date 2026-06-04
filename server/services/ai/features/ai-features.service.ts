import type { AIFeature } from '@/shared/dashboard'
import type { IAIFeaturesService } from './ai-features.service.interface'

const AI_FEATURES: AIFeature[] = [
    {
        id: 'lineup',
        name: 'Lineup optimizer',
        description: 'Best lineup for your budget',
        costPerUse: 20,
        iconKey: 'lineup',
    },
    {
        id: 'analysis',
        name: 'Player analysis',
        description: 'Stats, trends, matchups',
        costPerUse: 10,
        iconKey: 'analysis',
    },
    {
        id: 'trade',
        name: 'Trade advisor',
        description: 'Evaluate trade offers',
        costPerUse: 15,
        iconKey: 'trade',
    },
    {
        id: 'waiver',
        name: 'Waiver wire',
        description: 'Find hidden value',
        costPerUse: 10,
        iconKey: 'waiver',
    },
]

export class AIFeaturesService implements IAIFeaturesService {
    listFeatures(): AIFeature[] {
        return AI_FEATURES
    }
}
