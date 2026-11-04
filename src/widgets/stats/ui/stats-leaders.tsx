'use client'

import Link from 'next/link'

import { StarsBoard, useDailyStars } from '@/entities/stats'
import { TrendChart } from './trend-chart'

export function StatsLeaders() {
    const stars = useDailyStars(8)

    return (
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <StarsBoard
                title={stars.title}
                subtitle={stars.subtitle}
                stars={stars.stars}
                maxPoints={stars.maxPoints}
                loading={stars.isLoading}
                failed={stars.failed}
                onRetry={stars.retry}
            />
            <div className="space-y-6">
                <TrendChart data={stars.trend} />
                <p className="text-sm text-muted-foreground">
                    Points come from hits, runs, strikeouts and more, counted from the official game record.{' '}
                    <Link href="/rules" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">See how scoring works</Link>
                </p>
            </div>
        </div>
    )
}
