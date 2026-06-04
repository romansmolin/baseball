'use client'

import {
    ChartIncreaseIcon,
    ChartLineData01Icon,
    MagicWand01Icon,
    SparklesIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { useAIFeaturesData } from '@/entities/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import type { AIFeature } from '@/shared/dashboard'

const iconForKey = {
    lineup: MagicWand01Icon,
    analysis: ChartLineData01Icon,
    trade: ChartIncreaseIcon,
    waiver: SparklesIcon,
}

export const AIFeaturesGrid = () => {
    const { data, error, isLoading } = useAIFeaturesData()
    const features = data ?? []

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">AI features</CardTitle>
            </CardHeader>
            <CardContent>
                {error ? (
                    <div className="text-sm text-muted-foreground">
                        Couldn&apos;t load AI features.
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {isLoading
                            ? [0, 1, 2, 3].map((i) => <AIFeatureSkeleton key={i} />)
                            : features.map((feature) => (
                                  <AIFeatureCard key={feature.id} feature={feature} />
                              ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

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

const AIFeatureSkeleton = () => (
    <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-4">
        <div className="size-8 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-3 w-40 animate-pulse rounded bg-muted" />
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
    </div>
)
