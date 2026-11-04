'use client'

import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'

import {
    type ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from '@/shared/ui/chart'

interface TrendPoint {
    label: string
    best: number
    average: number
}

const config = {
    best: { label: 'Best lineup', color: 'var(--board)' },
    average: { label: 'Average lineup', color: 'var(--primary)' },
} satisfies ChartConfig

export function TrendChart({ data }: { data: TrendPoint[] }) {
    return (
        <section aria-labelledby="trend-title" className="rounded-lg border border-border bg-card p-5">
            <h2 id="trend-title" className="font-anton text-2xl uppercase leading-none">Lineup scores by day</h2>
            <p className="mt-2 text-sm text-muted-foreground">
                The best lineup and the average lineup of each daily contest, from the last {data.length || 14} contest days.
            </p>
            {data.length === 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">Scores show up here after the first contest finishes.</p>
            ) : (
                <ChartContainer config={config} className="mt-4 aspect-auto h-60 w-full">
                    <ComposedChart data={data} margin={{ left: 0, right: 4, top: 8 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={24} />
                        <YAxis width={32} tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent formatter={(value) => Number(value).toFixed(1)} />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="best" fill="var(--color-best)" radius={[3, 3, 0, 0]} />
                        <Line dataKey="average" type="monotone" stroke="var(--color-average)" strokeWidth={2.5} dot={false} />
                    </ComposedChart>
                </ChartContainer>
            )}
        </section>
    )
}
