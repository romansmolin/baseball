import type { AIFeature } from '@/shared/dashboard'

export interface IAIFeaturesService {
    listFeatures(): AIFeature[]
}
