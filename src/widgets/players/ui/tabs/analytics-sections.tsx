import {
    CONFIDENCE_LABEL,
    formatCount,
    formatDecimal,
    formatInnings,
    formatRate,
    formatScore,
    type ExpectedStats,
    type FormWindow,
    type HittingAnalytics,
    type HittingLine,
    type PitchingAnalytics,
    type PitchingLine,
    type PlayerStatus,
    type SplitKey,
} from '@/shared/analytics'
import type { PlayerOutlook } from '@/shared/estimates'
import { cn } from '@/shared/utils'

const SPLIT_LABEL: Record<SplitKey, string> = {
    vsLeft: 'vs LHP',
    vsRight: 'vs RHP',
    home: 'Home',
    away: 'Away',
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{children}</h3>
)

export const OutlookCard = ({ outlook }: { outlook: PlayerOutlook }) => (
    <section className="rounded-xl border border-foreground/10 p-4">
        <div className="flex items-center justify-between gap-3">
            <div>
                <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Outlook score</div>
                <div className="text-xs text-muted-foreground">An estimate from form, splits and expected stats</div>
            </div>
            <div className="text-right">
                <div className="font-anton text-4xl leading-none tabular-nums">{formatScore(outlook.score)}</div>
                <div className="mt-1 text-xs text-muted-foreground">{CONFIDENCE_LABEL[outlook.confidence]}</div>
            </div>
        </div>
        {outlook.factors.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-foreground/10 pt-3">
                {outlook.factors.map((factor) => (
                    <li key={factor.key} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">{factor.label}</span>
                        <span
                            className={cn(
                                'font-mono font-semibold tabular-nums',
                                factor.effect > 0 && 'text-[#16a34a]',
                                factor.effect < 0 && 'text-[#dc2626]',
                            )}
                        >
                            {factor.effect > 0 ? '+' : ''}
                            {factor.effect.toFixed(1)}
                        </span>
                    </li>
                ))}
            </ul>
        )}
    </section>
)

export const StatusPill = ({ status }: { status: PlayerStatus }) => (
    <span
        className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            status.available ? 'bg-[#22c55e]/10 text-[#16a34a]' : 'bg-[#ef4444]/12 text-[#dc2626]',
        )}
    >
        {status.description}
    </span>
)

interface Column<Line> {
    label: string
    value: (line: Line) => string
}

const HITTING_COLUMNS: Column<HittingLine>[] = [
    { label: 'PA', value: (l) => formatCount(l.plateAppearances) },
    { label: 'AVG', value: (l) => formatRate(l.avg) },
    { label: 'OBP', value: (l) => formatRate(l.obp) },
    { label: 'SLG', value: (l) => formatRate(l.slg) },
    { label: 'OPS', value: (l) => formatRate(l.ops) },
    { label: 'HR', value: (l) => formatCount(l.homeRuns) },
    { label: 'RBI', value: (l) => formatCount(l.rbi) },
    { label: 'SB', value: (l) => formatCount(l.stolenBases) },
]

const PITCHING_COLUMNS: Column<PitchingLine>[] = [
    { label: 'IP', value: (l) => formatInnings(l.inningsPitched) },
    { label: 'ERA', value: (l) => formatDecimal(l.era) },
    { label: 'WHIP', value: (l) => formatDecimal(l.whip) },
    { label: 'K', value: (l) => formatCount(l.strikeOuts) },
    { label: 'BB', value: (l) => formatCount(l.walks) },
    { label: 'K/9', value: (l) => formatDecimal(l.strikeoutsPer9) },
    { label: 'W', value: (l) => formatCount(l.wins) },
    { label: 'L', value: (l) => formatCount(l.losses) },
]

function LineTable<Line>({
    columns,
    rows,
}: {
    columns: Column<Line>[]
    rows: { label: string; line: Line }[]
}) {
    return (
        <div className="overflow-x-auto rounded-lg border border-foreground/10">
            <table className="w-full min-w-[420px] text-sm">
                <thead>
                    <tr className="border-b border-foreground/10 text-xs text-muted-foreground">
                        <th className="px-3 py-2 text-left font-medium" />
                        {columns.map((column) => (
                            <th key={column.label} className="px-2 py-2 text-right font-medium">
                                {column.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.label} className="border-b border-foreground/5 last:border-0">
                            <td className="px-3 py-2 text-left text-muted-foreground">{row.label}</td>
                            {columns.map((column) => (
                                <td key={column.label} className="px-2 py-2 text-right font-mono tabular-nums">
                                    {column.value(row.line)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

const formRows = <Line,>(windows: FormWindow<Line>[]) =>
    windows.map((w) => ({ label: `Last ${w.games}`, line: w.line }))

export const HittingSection = ({ hitting }: { hitting: HittingAnalytics }) => (
    <section className="space-y-4">
        <SectionTitle>Hitting</SectionTitle>
        <LineTable
            columns={HITTING_COLUMNS}
            rows={[
                ...(hitting.season ? [{ label: 'Season', line: hitting.season }] : []),
                ...formRows(hitting.form),
                ...hitting.splits.map((s) => ({ label: SPLIT_LABEL[s.key], line: s.line })),
            ]}
        />
        <div className="grid grid-cols-3 gap-2.5">
            <MiniStat label="wOBA" value={formatRate(hitting.woba)} />
            <MiniStat label="wRC+" value={formatCount(hitting.wrcPlus)} />
            <MiniStat label="WAR" value={formatDecimal(hitting.war, 1)} />
        </div>
    </section>
)

export const PitchingSection = ({ pitching }: { pitching: PitchingAnalytics }) => (
    <section className="space-y-4">
        <SectionTitle>Pitching</SectionTitle>
        <LineTable
            columns={PITCHING_COLUMNS}
            rows={[
                ...(pitching.season ? [{ label: 'Season', line: pitching.season }] : []),
                ...formRows(pitching.form).map((r) => ({ ...r, label: `${r.label} outings` })),
                ...pitching.splits.map((s) => ({ label: SPLIT_LABEL[s.key], line: s.line })),
            ]}
        />
        <div className="grid grid-cols-2 gap-2.5">
            <MiniStat label="FIP" value={formatDecimal(pitching.fip)} />
            <MiniStat label="WAR" value={formatDecimal(pitching.war, 1)} />
        </div>
    </section>
)

export const ExpectedSection = ({ expected }: { expected: ExpectedStats }) => (
    <section>
        <SectionTitle>Expected stats (Statcast)</SectionTitle>
        <div className="grid grid-cols-3 gap-2.5">
            <MiniStat label="xBA" value={formatRate(expected.xba)} />
            <MiniStat label="xSLG" value={formatRate(expected.xslg)} />
            <MiniStat label="xwOBA" value={formatRate(expected.xwoba)} />
            <MiniStat label="Barrel %" value={formatDecimal(expected.barrelRate, 1)} />
            <MiniStat label="Hard-hit %" value={formatDecimal(expected.hardHitRate, 1)} />
            <MiniStat label="Sprint ft/s" value={formatDecimal(expected.sprintSpeed, 1)} />
        </div>
    </section>
)

const MiniStat = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-lg border border-foreground/10 px-3 py-2.5 text-center">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-mono text-sm font-semibold tabular-nums">{value}</div>
    </div>
)
