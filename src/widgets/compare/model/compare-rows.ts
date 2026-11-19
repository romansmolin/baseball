import {
    formatCount,
    formatDecimal,
    formatInnings,
    formatRate,
    type PlayerAnalytics,
} from '@/shared/analytics'

// key: counted towards "leads X of Y". context: always shown, never highlighted (volume, not quality). advanced: behind the toggle.
export type CompareTier = 'key' | 'context' | 'advanced'

export interface CompareRow {
    key: string
    label: string
    hint: string
    tier: CompareTier
    better: 'higher' | 'lower'
    value: (player: PlayerAnalytics) => number | null
    format: (value: number | null) => string
}

export interface CompareSection {
    title: string
    rows: CompareRow[]
}

const formOps = (player: PlayerAnalytics, games: number) =>
    player.hitting?.form.find((w) => w.games === games || (games === 14 && w.games > 7 && w.games <= 14))?.line.ops ?? null

const splitOps = (player: PlayerAnalytics, key: 'vsLeft' | 'vsRight') =>
    player.hitting?.splits.find((s) => s.key === key)?.line.ops ?? null

export const COMPARE_SECTIONS: CompareSection[] = [
    {
        title: 'Hitting',
        rows: [
            { key: 'pa', label: 'Plate appearances', hint: 'Times he came to bat this season. More plate appearances means more reliable stats.', tier: 'context', better: 'higher', value: (p) => p.hitting?.season?.plateAppearances ?? null, format: formatCount },
            { key: 'avg', label: 'AVG', hint: 'Batting average: hits per at-bat.', tier: 'key', better: 'higher', value: (p) => p.hitting?.season?.avg ?? null, format: formatRate },
            { key: 'obp', label: 'OBP', hint: 'On-base percentage: how often he reaches base.', tier: 'key', better: 'higher', value: (p) => p.hitting?.season?.obp ?? null, format: formatRate },
            { key: 'slg', label: 'SLG', hint: 'Slugging: total bases per at-bat, rewards extra-base hits.', tier: 'key', better: 'higher', value: (p) => p.hitting?.season?.slg ?? null, format: formatRate },
            { key: 'ops', label: 'OPS', hint: 'OBP + SLG. The quickest one-number read on a hitter.', tier: 'key', better: 'higher', value: (p) => p.hitting?.season?.ops ?? null, format: formatRate },
            { key: 'hr', label: 'Home runs', hint: 'Home runs this season.', tier: 'key', better: 'higher', value: (p) => p.hitting?.season?.homeRuns ?? null, format: formatCount },
            { key: 'rbi', label: 'RBI', hint: 'Runs batted in this season.', tier: 'key', better: 'higher', value: (p) => p.hitting?.season?.rbi ?? null, format: formatCount },
            { key: 'runs', label: 'Runs', hint: 'Runs scored this season.', tier: 'key', better: 'higher', value: (p) => p.hitting?.season?.runs ?? null, format: formatCount },
            { key: 'sb', label: 'Stolen bases', hint: 'Stolen bases this season.', tier: 'key', better: 'higher', value: (p) => p.hitting?.season?.stolenBases ?? null, format: formatCount },
            { key: 'woba', label: 'wOBA', hint: 'Weighted on-base average: like OBP, but a homer counts more than a single.', tier: 'advanced', better: 'higher', value: (p) => p.hitting?.woba ?? null, format: formatRate },
            { key: 'wrc', label: 'wRC+', hint: 'Runs created vs league average, park-adjusted. 100 is average, 120 is 20% better.', tier: 'advanced', better: 'higher', value: (p) => p.hitting?.wrcPlus ?? null, format: (v) => formatDecimal(v, 0) },
            { key: 'war', label: 'WAR', hint: 'Wins above replacement: total value compared with a bench-level player.', tier: 'advanced', better: 'higher', value: (p) => p.hitting?.war ?? null, format: (v) => formatDecimal(v, 1) },
        ],
    },
    {
        title: 'Form and splits (OPS)',
        rows: [
            { key: 'ops7', label: 'Last 7 games', hint: 'OPS over his last 7 games: current form.', tier: 'key', better: 'higher', value: (p) => formOps(p, 7), format: formatRate },
            { key: 'ops14', label: 'Last 14 games', hint: 'OPS over his last 14 games: current form.', tier: 'key', better: 'higher', value: (p) => formOps(p, 14), format: formatRate },
            { key: 'opsL', label: 'vs left-handed pitching', hint: 'OPS against left-handed pitchers.', tier: 'advanced', better: 'higher', value: (p) => splitOps(p, 'vsLeft'), format: formatRate },
            { key: 'opsR', label: 'vs right-handed pitching', hint: 'OPS against right-handed pitchers.', tier: 'advanced', better: 'higher', value: (p) => splitOps(p, 'vsRight'), format: formatRate },
        ],
    },
    {
        title: 'Pitching',
        rows: [
            { key: 'ip', label: 'Innings pitched', hint: 'Innings pitched. More innings means more reliable stats and more fantasy volume.', tier: 'context', better: 'higher', value: (p) => p.pitching?.season?.inningsPitched ?? null, format: formatInnings },
            { key: 'era', label: 'ERA', hint: 'Earned runs allowed per 9 innings. Lower is better.', tier: 'key', better: 'lower', value: (p) => p.pitching?.season?.era ?? null, format: formatDecimal },
            { key: 'whip', label: 'WHIP', hint: 'Walks plus hits per inning. Lower is better.', tier: 'key', better: 'lower', value: (p) => p.pitching?.season?.whip ?? null, format: formatDecimal },
            { key: 'k9', label: 'K/9', hint: 'Strikeouts per 9 innings.', tier: 'key', better: 'higher', value: (p) => p.pitching?.season?.strikeoutsPer9 ?? null, format: formatDecimal },
            { key: 'fip', label: 'FIP', hint: 'ERA rebuilt from strikeouts, walks and homers only, so defense luck is removed. Lower is better.', tier: 'advanced', better: 'lower', value: (p) => p.pitching?.fip ?? null, format: formatDecimal },
            { key: 'pwar', label: 'WAR', hint: 'Wins above replacement: total value compared with a bench-level pitcher.', tier: 'advanced', better: 'higher', value: (p) => p.pitching?.war ?? null, format: (v) => formatDecimal(v, 1) },
        ],
    },
    {
        title: 'Expected stats (Statcast)',
        rows: [
            { key: 'xba', label: 'xBA', hint: 'Batting average he should have, from exit speed and launch angle. Above his real AVG means unlucky.', tier: 'advanced', better: 'higher', value: (p) => p.expected?.xba ?? null, format: formatRate },
            { key: 'xslg', label: 'xSLG', hint: 'Slugging he should have, from exit speed and launch angle.', tier: 'advanced', better: 'higher', value: (p) => p.expected?.xslg ?? null, format: formatRate },
            { key: 'xwoba', label: 'xwOBA', hint: 'wOBA he should have, from exit speed and launch angle. Above his real wOBA means unlucky.', tier: 'advanced', better: 'higher', value: (p) => p.expected?.xwoba ?? null, format: formatRate },
            { key: 'barrel', label: 'Barrel %', hint: 'Share of batted balls hit at the ideal speed and angle for extra-base hits.', tier: 'advanced', better: 'higher', value: (p) => p.expected?.barrelRate ?? null, format: (v) => formatDecimal(v, 1) },
            { key: 'hard', label: 'Hard-hit %', hint: 'Share of batted balls hit 95 mph or harder.', tier: 'advanced', better: 'higher', value: (p) => p.expected?.hardHitRate ?? null, format: (v) => formatDecimal(v, 1) },
            { key: 'sprint', label: 'Sprint speed (ft/s)', hint: 'Top running speed, feet per second.', tier: 'advanced', better: 'higher', value: (p) => p.expected?.sprintSpeed ?? null, format: (v) => formatDecimal(v, 1) },
        ],
    },
]
