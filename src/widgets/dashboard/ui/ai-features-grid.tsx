import {
    ChartIncreaseIcon,
    ChartLineData01Icon,
    MagicWand01Icon,
    SparklesIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

import { aiFeatures } from '../model/mock-data'
import type { AIFeature } from '../model/dashboard.type'

const iconForKey = {
    lineup: MagicWand01Icon,
    analysis: ChartLineData01Icon,
    trade: ChartIncreaseIcon,
    waiver: SparklesIcon,
}

export const AIFeaturesGrid = () => (
    <Card>
        <CardHeader>
            <CardTitle className="text-base">AI features</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
                {aiFeatures.map((feature) => (
                    <AIFeatureCard key={feature.id} feature={feature} />
                ))}
            </div>
        </CardContent>
    </Card>
)

const AIFeatureCard = ({ feature }: { feature: AIFeature }) => (
    <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-4">
        <span className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
            <HugeiconsIcon icon={iconForKey[feature.iconKey]} className="size-4" />
        </span>
        <div className="font-medium">{feature.name}</div>
        <div className="text-xs text-muted-foreground">{feature.description}</div>
        <div className="text-xs text-muted-foreground">{feature.costPerUse} credits / use</div>
    </div>
)
