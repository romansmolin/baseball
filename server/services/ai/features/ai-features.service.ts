import type { AIFeature } from '@/shared/dashboard'
import type { IAIFeaturesService } from './ai-features.service.interface'

const AI_FEATURES: AIFeature[] = [
    {
        id: 'game_picks',
        name: 'Game picks',
        description: 'Who to start, sit or watch in a game',
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
        id: 'autofill',
        name: 'Team autofill',
        description: 'Fill the empty slots of a team',
        costPerUse: 3,
        iconKey: 'autofill',
    },
]

export class AIFeaturesService implements IAIFeaturesService {
    listFeatures(): AIFeature[] {
        return AI_FEATURES
    }
}
