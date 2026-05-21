import {
    Activity01Icon,
    ChampionIcon,
    Coins01Icon,
    MedalFirstPlaceIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Card, CardContent } from '@/shared/ui/card'

import { metricCards } from '../model/mock-data'
import type { MetricCard as MetricCardType } from '../model/dashboard.type'

const iconForKey = {
    credits: Coins01Icon,
    active: Activity01Icon,
    rank: ChampionIcon,
    record: MedalFirstPlaceIcon,
}

export const MetricCards = () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card) => (
            <MetricCard key={card.id} card={card} />
        ))}
    </div>
)

const MetricCard = ({ card }: { card: MetricCardType }) => (
    <Card size="sm">
        <CardContent className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <HugeiconsIcon icon={iconForKey[card.iconKey]} className="size-3.5" />
                </span>
                {card.label}
            </div>
            <div className="font-anton text-3xl tracking-wide">{card.value}</div>
            <div className="text-xs text-muted-foreground">{card.caption}</div>
        </CardContent>
    </Card>
)
