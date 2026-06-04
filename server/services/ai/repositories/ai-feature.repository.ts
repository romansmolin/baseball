// Read-only repository for AIFeature lookups. The AI orchestrator calls
// findByKey() once per invocation to check isActive and read the configured
// costCredits + modelName. Caching is left to higher layers — feature
// metadata changes rarely but we don't want stale data on a toggle off.

import { prisma } from '../../../lib/prisma'

export interface AIFeatureRecord {
    id: string
    key: string
    costCredits: number
    modelName: string
    isActive: boolean
}

export interface IAIFeatureRepository {
    findByKey(key: string): Promise<AIFeatureRecord | null>
}

export class AIFeatureRepository implements IAIFeatureRepository {
    async findByKey(key: string): Promise<AIFeatureRecord | null> {
        const row = await prisma.aIFeature.findUnique({
            where: { key },
            select: {
                id: true,
                key: true,
                costCredits: true,
                modelName: true,
                isActive: true,
            },
        })
        return row
    }
}
