'use client'

import Link from 'next/link'

import { StarsBoard, useDailyStars } from '@/entities/stats'

/** The day's best players with the real box-score line behind their points. */
export function YesterdaysStars() {
    const stars = useDailyStars(5)

    return (
        <div>
            <StarsBoard
                tone="paper"
                title={stars.title}
                subtitle={stars.subtitle}
                stars={stars.stars}
                maxPoints={stars.maxPoints}
                loading={stars.isLoading}
                failed={stars.failed}
                onRetry={stars.retry}
            />
            <p className="mt-3 text-sm text-muted-foreground">
                Points are counted from official box scores.{' '}
                <Link href="/stats" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">Open all stats</Link>
            </p>
        </div>
    )
}
