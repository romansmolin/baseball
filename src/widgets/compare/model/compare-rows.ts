import {
    formatCount,
    formatDecimal,
    formatInnings,
    formatRate,
    formatScore,
    type PlayerAnalytics,
} from '@/shared/analytics'

export interface CompareRow {
    key: string
    label: string
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
        title: 'Outlook',
        rows: [{ key: 'outlook', label: 'Outlook score', better: 'higher', value: (p) => p.outlook.score, format: formatScore }],
    },
    {
        title: 'Hitting',
        rows: [
            { key: 'pa', label: 'Plate appearances', better: 'higher', value: (p) => p.hitting?.season?.plateAppearances ?? null, format: formatCount },
            { key: 'avg', label: 'AVG', better: 'higher', value: (p) => p.hitting?.season?.avg ?? null, format: formatRate },
            { key: 'obp', label: 'OBP', better: 'higher', value: (p) => p.hitting?.season?.obp ?? null, format: formatRate },
            { key: 'slg', label: 'SLG', better: 'higher', value: (p) => p.hitting?.season?.slg ?? null, format: formatRate },
            { key: 'ops', label: 'OPS', better: 'higher', value: (p) => p.hitting?.season?.ops ?? null, format: formatRate },
            { key: 'hr', label: 'Home runs', better: 'higher', value: (p) => p.hitting?.season?.homeRuns ?? null, format: formatCount },
            { key: 'rbi', label: 'RBI', better: 'higher', value: (p) => p.hitting?.season?.rbi ?? null, format: formatCount },
            { key: 'runs', label: 'Runs', better: 'higher', value: (p) => p.hitting?.season?.runs ?? null, format: formatCount },
            { key: 'sb', label: 'Stolen bases', better: 'higher', value: (p) => p.hitting?.season?.stolenBases ?? null, format: formatCount },
            { key: 'woba', label: 'wOBA', better: 'higher', value: (p) => p.hitting?.woba ?? null, format: formatRate },
            { key: 'wrc', label: 'wRC+', better: 'higher', value: (p) => p.hitting?.wrcPlus ?? null, format: formatCount },
            { key: 'war', label: 'WAR', better: 'higher', value: (p) => p.hitting?.war ?? null, format: (v) => formatDecimal(v, 1) },
        ],
    },
    {
        title: 'Form and splits (OPS)',
        rows: [
            { key: 'ops7', label: 'Last 7 games', better: 'higher', value: (p) => formOps(p, 7), format: formatRate },
            { key: 'ops14', label: 'Last 14 games', better: 'higher', value: (p) => formOps(p, 14), format: formatRate },
            { key: 'opsL', label: 'vs left-handed pitching', better: 'higher', value: (p) => splitOps(p, 'vsLeft'), format: formatRate },
            { key: 'opsR', label: 'vs right-handed pitching', better: 'higher', value: (p) => splitOps(p, 'vsRight'), format: formatRate },
        ],
    },
    {
        title: 'Pitching',
        rows: [
            { key: 'ip', label: 'Innings pitched', better: 'higher', value: (p) => p.pitching?.season?.inningsPitched ?? null, format: formatInnings },
            { key: 'era', label: 'ERA', better: 'lower', value: (p) => p.pitching?.season?.era ?? null, format: formatDecimal },
            { key: 'whip', label: 'WHIP', better: 'lower', value: (p) => p.pitching?.season?.whip ?? null, format: formatDecimal },
            { key: 'k9', label: 'K/9', better: 'higher', value: (p) => p.pitching?.season?.strikeoutsPer9 ?? null, format: formatDecimal },
            { key: 'fip', label: 'FIP', better: 'lower', value: (p) => p.pitching?.fip ?? null, format: formatDecimal },
            { key: 'pwar', label: 'WAR', better: 'higher', value: (p) => p.pitching?.war ?? null, format: (v) => formatDecimal(v, 1) },
        ],
    },
    {
        title: 'Expected stats (Statcast)',
        rows: [
            { key: 'xba', label: 'xBA', better: 'higher', value: (p) => p.expected?.xba ?? null, format: formatRate },
            { key: 'xslg', label: 'xSLG', better: 'higher', value: (p) => p.expected?.xslg ?? null, format: formatRate },
            { key: 'xwoba', label: 'xwOBA', better: 'higher', value: (p) => p.expected?.xwoba ?? null, format: formatRate },
            { key: 'barrel', label: 'Barrel %', better: 'higher', value: (p) => p.expected?.barrelRate ?? null, format: (v) => formatDecimal(v, 1) },
            { key: 'hard', label: 'Hard-hit %', better: 'higher', value: (p) => p.expected?.hardHitRate ?? null, format: (v) => formatDecimal(v, 1) },
            { key: 'sprint', label: 'Sprint speed (ft/s)', better: 'higher', value: (p) => p.expected?.sprintSpeed ?? null, format: (v) => formatDecimal(v, 1) },
        ],
    },
]
