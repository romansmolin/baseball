'use client'

import {
    ChampionIcon,
    Coins01Icon,
    MedalFirstPlaceIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { useMetricsData } from '@/entities/dashboard'
import { Card, CardContent } from '@/shared/ui/card'
import type { DashboardMetrics, MetricCard as MetricCardType } from '@/shared/dashboard'

const iconForKey = {
    credits: Coins01Icon,
    active: ChampionIcon,
    rank: ChampionIcon,
    record: MedalFirstPlaceIcon,
}

export const MetricCards = () => {
    const { data, error, isLoading } = useMetricsData()
    const cards = data ? toCards(data) : []

    if (error) {
        return (
            <div className="text-sm text-muted-foreground">Couldn&apos;t load dashboard metrics.</div>
        )
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading
                ? [0, 1, 2, 3].map((i) => <MetricCardSkeleton key={i} />)
                : cards.map((card) => <MetricCard key={card.id} card={card} />)}
        </div>
    )
}

function toCards(m: DashboardMetrics): MetricCardType[] {
    return [
        {
            id: 'credits',
            label: 'Credits',
            value: m.credits.toLocaleString(),
            caption: '+250 this week',
            iconKey: 'credits',
        },
        {
            id: 'rank',
            label: 'Best rank this week',
            value: m.bestRankThisWeek ? `#${m.bestRankThisWeek.rank}` : '—',
            caption: m.bestRankThisWeek
                ? `of ${m.bestRankThisWeek.total.toLocaleString()} in ${m.bestRankThisWeek.tournamentName}`
                : 'No ranked tournaments yet',
            iconKey: 'rank',
        },
        {
            id: 'record',
            label: 'League record',
            value: m.leagueRecord ? `${m.leagueRecord.wins} – ${m.leagueRecord.losses}` : '—',
            caption: m.leagueRecord?.leagueName ?? 'Not in a league',
            iconKey: 'record',
        },
    ]
}

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

const MetricCardSkeleton = () => (
    <Card size="sm">
        <CardContent className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <div className="size-6 animate-pulse rounded-md bg-muted" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        </CardContent>
    </Card>
)
