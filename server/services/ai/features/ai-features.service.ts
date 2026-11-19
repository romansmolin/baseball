import type { AIFeature } from '@/shared/dashboard'
import { AUTOFILL_COST_CREDITS } from '@/shared/team-builder'
import type { IAIFeaturesService } from './ai-features.service.interface'

const AI_FEATURES: AIFeature[] = [
    {
        id: 'game_analysis',
        name: 'Game analysis',
        description: 'Likely result, key factors and players to take',
        costPerUse: 300,
        iconKey: 'analysis',
    },
    {
        id: 'performer_analytics',
        name: 'Performer analytics',
        description: 'Charts that show why a player is hot',
        costPerUse: 100,
        iconKey: 'analysis',
    },
    {
        id: 'autofill',
        name: 'Team autofill',
        description: 'Fill the empty slots of a team',
        costPerUse: AUTOFILL_COST_CREDITS,
        iconKey: 'autofill',
    },
]

export class AIFeaturesService implements IAIFeaturesService {
    listFeatures(): AIFeature[] {
        return AI_FEATURES
    }
}
