'use client'

import { usePlayerAnalyticsData } from '@/entities/analytics'
import type { GameLeague } from '@/shared/games'
import type { PerformerGroup } from '@/shared/performers'
import type { PlayerAnalytics, SplitKey } from '@/shared/analytics'

import { COOL, HOT, Panel, ValueBar } from './performer-chart-parts'

const SPLIT_LABEL: Record<SplitKey, string> = {
    vsLeft: 'vs lefties',
    vsRight: 'vs righties',
    home: 'Home',
    away: 'Away',
}

// Rough MLB averages, only used as a reference tick on the contact bars.
const BARREL_AVG = 8
const HARD_HIT_AVG = 39

interface Pair {
    label: string
    actual: number | null
    expected: number | null
    digits: number
    // For ERA a lower number is the better one.
    lowerIsBetter: boolean
}

const verdict = (pair: Pair): string => {
    if (pair.actual === null || pair.expected === null) return ''
    const gap = (pair.actual - pair.expected) * (pair.lowerIsBetter ? -1 : 1)
    const limit = pair.digits === 3 ? 0.015 : 0.4
    if (gap > limit)
        return pair.lowerIsBetter ? 'Results beat the underlying numbers' : 'Running hot vs contact quality'
    if (gap < -limit) return pair.lowerIsBetter ? 'Underlying numbers are better' : 'Unlucky so far'
    return 'In line'
}

const pairsFor = (analytics: PlayerAnalytics, group: PerformerGroup): Pair[] => {
    if (group === 'hitting') {
        const season = analytics.hitting?.season
        const expected = analytics.expected
        return [
            {
                label: 'Batting average',
                actual: season?.avg ?? null,
                expected: expected?.xba ?? null,
                digits: 3,
                lowerIsBetter: false,
            },
            {
                label: 'Slugging',
                actual: season?.slg ?? null,
                expected: expected?.xslg ?? null,
                digits: 3,
                lowerIsBetter: false,
            },
            {
                label: 'wOBA',
                actual: analytics.hitting?.woba ?? null,
                expected: expected?.xwoba ?? null,
                digits: 3,
                lowerIsBetter: false,
            },
        ].filter((p) => p.actual !== null && p.expected !== null)
    }
    const era = analytics.pitching?.season?.era ?? null
    const fip = analytics.pitching?.fip ?? null
    return era !== null && fip !== null
        ? [{ label: 'ERA vs FIP', actual: era, expected: fip, digits: 2, lowerIsBetter: true }]
        : []
}

export const MlbContext = ({
    playerId,
    group,
    league,
}: {
    playerId: number
    group: PerformerGroup
    league: GameLeague
}) => {
    const { data } = usePlayerAnalyticsData(playerId)
    if (!data) return null

    const hitting = group === 'hitting'
    const season = hitting ? data.hitting?.season : data.pitching?.season
    const sample = hitting ? data.hitting?.season?.plateAppearances : data.pitching?.season?.inningsPitched
    const pairs = pairsFor(data, group)
    const splits = (hitting ? data.hitting?.splits : data.pitching?.splits) ?? []
    const splitValue = (split: { line: unknown }) =>
        hitting ? (split.line as { ops: number | null }).ops : (split.line as { era: number | null }).era
    const expected = data.expected
    const hasContact = expected && (expected.barrelRate !== null || expected.hardHitRate !== null)

    if (!season && pairs.length === 0 && splits.length === 0 && !hasContact) return null

    const small = sample != null && sample < (hitting ? 100 : 30)

    return (
        <section className="space-y-3">
            <div>
                <h3 className="text-base font-semibold">MLB season context</h3>
                <p className="text-xs text-muted-foreground">
                    {league === 'mlb'
                        ? 'Season-long numbers.'
                        : 'The same player in the majors, for a longer view than one week of winter ball.'}
                    {small &&
                        ` Small sample (${hitting ? `${sample} plate appearances` : `${sample?.toFixed(0)} innings`}), read with care.`}
                </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
                {pairs.length > 0 && (
                    <Panel
                        title={hitting ? 'Results vs expected' : 'ERA vs FIP'}
                        note={
                            hitting
                                ? 'Expected numbers come from how hard and at what angle he hits the ball. A big gap is luck.'
                                : 'FIP counts only what the pitcher controls. A gap with ERA points to defence or luck.'
                        }
                    >
                        <ul className="space-y-4">
                            {pairs.map((pair) => {
                                const max = Math.max(pair.actual ?? 0, pair.expected ?? 0) || 1
                                return (
                                    <li key={pair.label} className="space-y-1.5">
                                        <div className="flex items-baseline justify-between text-sm">
                                            <span className="font-medium">{pair.label}</span>
                                            <span className="text-xs text-muted-foreground">{verdict(pair)}</span>
                                        </div>
                                        <ValueBar
                                            label="Actual"
                                            value={pair.actual}
                                            max={max}
                                            digits={pair.digits}
                                            color={HOT}
                                        />
                                        <ValueBar
                                            label={hitting ? 'Expected' : 'FIP'}
                                            value={pair.expected}
                                            max={max}
                                            digits={pair.digits}
                                            color={COOL}
                                        />
                                    </li>
                                )
                            })}
                        </ul>
                    </Panel>
                )}
                {hasContact && (
                    <Panel
                        title={hitting ? 'Quality of contact' : 'Contact allowed'}
                        note={`The tick marks a rough MLB average. ${hitting ? 'Higher is better.' : 'Lower is better.'}`}
                    >
                        <div className="space-y-3">
                            <ValueBar
                                label="Barrel rate"
                                value={expected.barrelRate}
                                max={25}
                                digits={1}
                                unit="%"
                                color={HOT}
                                marker={BARREL_AVG}
                            />
                            <ValueBar
                                label="Hard-hit rate"
                                value={expected.hardHitRate}
                                max={70}
                                digits={1}
                                unit="%"
                                color={HOT}
                                marker={HARD_HIT_AVG}
                            />
                            {hitting && expected.sprintSpeed !== null && (
                                <ValueBar
                                    label="Sprint speed"
                                    value={expected.sprintSpeed}
                                    max={32}
                                    digits={1}
                                    unit=" ft/s"
                                    color={COOL}
                                    marker={27}
                                />
                            )}
                        </div>
                    </Panel>
                )}
                {splits.length > 0 && (
                    <Panel
                        title={hitting ? 'OPS in different spots' : 'ERA in different spots'}
                        note="Shows where he does his damage."
                    >
                        <div className="space-y-3">
                            {(() => {
                                const values = splits.map(splitValue)
                                const max = Math.max(...values.map((v) => v ?? 0)) || 1
                                return splits.map((split, i) => (
                                    <ValueBar
                                        key={split.key}
                                        label={SPLIT_LABEL[split.key]}
                                        value={values[i]}
                                        max={max}
                                        digits={hitting ? 3 : 2}
                                        color={HOT}
                                    />
                                ))
                            })()}
                        </div>
                    </Panel>
                )}
                {((hitting ? data.hitting?.war : data.pitching?.war) ?? null) !== null && (
                    <Panel
                        title="Overall value"
                        note="Wins above a replacement-level player. About 2 is a solid starter."
                    >
                        <div className="flex flex-wrap gap-6">
                            <Figure
                                label="WAR"
                                value={(hitting ? data.hitting?.war : data.pitching?.war) ?? null}
                                digits={1}
                            />
                            {hitting && <Figure label="wRC+" value={data.hitting?.wrcPlus ?? null} digits={0} />}
                            {!hitting && <Figure label="FIP" value={data.pitching?.fip ?? null} digits={2} />}
                        </div>
                    </Panel>
                )}
            </div>
        </section>
    )
}

const Figure = ({ label, value, digits }: { label: string; value: number | null; digits: number }) => (
    <div>
        <div className="text-2xl leading-tight font-bold tabular-nums">
            {value === null ? '—' : value.toFixed(digits)}
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
    </div>
)
