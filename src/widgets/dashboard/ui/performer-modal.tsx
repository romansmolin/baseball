'use client'

import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Dialog } from '@base-ui/react/dialog'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts'

import Link from 'next/link'

import { usePerformerAnalytics } from '@/features/performer-analytics'
import type {
    PerformerComparison,
    PerformerDetail,
    PerformerGameEntry,
    PerformerGroup,
    TopPerformer,
} from '@/shared/performers'
import { Button } from '@/shared/ui/button'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/shared/ui/chart'
import { PlayerAvatar } from '@/shared/ui/player-avatar'
import { cn } from '@/shared/utils'

import { COOL, HOT, LOSS, Panel, ValueBar } from './performer-chart-parts'
import { MlbContext } from './performer-mlb-context'

export interface SelectedPerformer {
    player: TopPerformer
    group: PerformerGroup
}

const dayLabel = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export const PerformerModal = ({
    selected,
    open,
    onClose,
}: {
    selected: SelectedPerformer | null
    open: boolean
    onClose: () => void
}) => (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
        <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
            <Dialog.Popup
                className={cn(
                    'fixed top-1/2 left-1/2 z-50 flex max-h-[92vh] w-[min(60rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col',
                    'rounded-2xl border border-foreground/10 bg-card shadow-2xl transition-all outline-none',
                    'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
                    'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
                )}
            >
                {selected && <Content selected={selected} onClose={onClose} />}
            </Dialog.Popup>
        </Dialog.Portal>
    </Dialog.Root>
)

const Content = ({ selected, onClose }: { selected: SelectedPerformer; onClose: () => void }) => {
    const { player, group } = selected
    const a = usePerformerAnalytics({ playerId: player.playerId, league: player.league, group })

    return (
        <>
            <Header player={player} detail={a.analytics ?? undefined} />
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                {a.analytics ? (
                    <Charts detail={a.analytics} />
                ) : a.isRunning ? (
                    <Working />
                ) : (
                    <Offer cost={a.cost} balance={a.balance} error={a.error?.message} />
                )}
            </div>
            {!a.analytics && (
                <div className="flex items-center justify-end gap-2 border-t border-foreground/10 px-6 py-4">
                    {!a.canAfford && a.balance !== undefined && (
                        <Link href="/wallet" className="mr-auto text-sm underline">
                            Add credits
                        </Link>
                    )}
                    <Button variant="ghost" onClick={onClose} disabled={a.isRunning}>
                        Cancel
                    </Button>
                    <Button size="lg" disabled={!a.canAfford || a.isRunning} onClick={a.unlock}>
                        {a.isRunning ? 'Loading…' : `Unlock for ${a.cost} credits`}
                    </Button>
                </div>
            )}
        </>
    )
}

const INCLUDED = [
    ['Game by game', 'Points in each of the last 15 games, so you see a streak or a single big night.'],
    ['Trend and sources', 'How OPS or ERA moved, and which stats produced the points.'],
    ['This week vs the season', 'Whether this is a real jump or just his normal.'],
    ['MLB context', 'Expected stats, quality of contact, splits and WAR from his MLB season.'],
] as const

const Offer = ({ cost, balance, error }: { cost: number; balance: number | undefined; error: string | undefined }) => (
    <div className="mx-auto max-w-xl space-y-5 py-2">
        <ul className="space-y-3">
            {INCLUDED.map(([title, text]) => (
                <li key={title} className="flex gap-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    <p className="text-sm">
                        <span className="font-medium">{title}.</span>{' '}
                        <span className="text-muted-foreground">{text}</span>
                    </p>
                </li>
            ))}
        </ul>
        <div className="flex items-end justify-between gap-4 rounded-xl bg-muted/60 p-4">
            <div>
                <div className="text-xs text-muted-foreground">Cost</div>
                <div className="text-2xl leading-tight font-bold tabular-nums">{cost.toLocaleString()} credits</div>
            </div>
            <div className="text-right text-xs text-muted-foreground tabular-nums">
                <div>Balance {balance?.toLocaleString() ?? '—'}</div>
                {balance !== undefined && balance >= cost && <div>After {(balance - cost).toLocaleString()}</div>}
            </div>
        </div>
        <p className="text-xs text-muted-foreground">
            You are only charged if the analytics load. Once unlocked, they stay open for this player in this session.
        </p>
        {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
            </p>
        )}
    </div>
)

const Working = () => (
    <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl bg-muted" />
        ))}
    </div>
)

const Header = ({ player, detail }: { player: TopPerformer; detail: PerformerDetail | undefined }) => (
    <div className="flex items-center gap-4 border-b border-foreground/10 px-6 py-4">
        <PlayerAvatar playerId={player.playerId} name={player.name} className="size-16" />
        <div className="min-w-0 flex-1">
            <Dialog.Title className="truncate text-lg leading-tight font-semibold">{player.name}</Dialog.Title>
            <Dialog.Description className="truncate text-sm text-muted-foreground">
                {[player.position, player.teamName].filter(Boolean).join(' · ')}
            </Dialog.Description>
        </div>
        <div className="shrink-0 text-right">
            <div className="text-3xl leading-none font-bold tabular-nums">{player.points}</div>
            <div className="text-xs text-muted-foreground">
                pts in 7 days
                {detail?.pointsPerGame != null && detail.seasonPointsPerGame != null && (
                    <>
                        {' · '}
                        {detail.pointsPerGame} per game vs {detail.seasonPointsPerGame} usual
                    </>
                )}
            </div>
        </div>
        <Dialog.Close className="self-start rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Close">
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
        </Dialog.Close>
    </div>
)

const Charts = ({ detail }: { detail: PerformerDetail }) => {
    const hitting = detail.group === 'hitting'
    return (
        <div className="space-y-5">
            <Verdict detail={detail} />
            <div className="grid gap-5 md:grid-cols-2">
                <Panel
                    title="Points in every game"
                    note="Coral bars are the last 7 days. The dashed line is this player's usual points per game."
                >
                    <PointsChart detail={detail} />
                </Panel>
                <Panel
                    title={`${detail.trendLabel} through the season`}
                    note={
                        hitting
                            ? 'A rising line means the bat is heating up.'
                            : 'A falling line means the pitcher is getting harder to score on. Lower is better.'
                    }
                >
                    <TrendChart games={detail.games} label={detail.trendLabel} />
                </Panel>
                <Panel title="Where the points came from" note="Red bars are points lost, for example to strikeouts.">
                    <MixChart mix={detail.mix} />
                </Panel>
                <Panel
                    title="This week vs the season"
                    note="Shows whether this week is a real jump or just his normal."
                >
                    <Comparison rows={detail.comparison} />
                </Panel>
            </div>
            <MlbContext playerId={detail.playerId} group={detail.group} league={detail.league} />
        </div>
    )
}

const Verdict = ({ detail }: { detail: PerformerDetail }) => (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl bg-muted/50 px-4 py-3">
        {detail.stats.map((stat) => (
            <div key={stat.label}>
                <div className="text-xl leading-tight font-bold tabular-nums">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
        ))}
        <p className="ml-auto max-w-sm text-sm text-muted-foreground">
            {detail.windowGames} {detail.windowGames === 1 ? 'game' : 'games'} in the last 7 days.
        </p>
    </div>
)

const chartConfig: ChartConfig = { points: { label: 'Points', color: HOT } }

const GameTooltip = ({
    active,
    payload,
    unit,
}: {
    active?: boolean
    payload?: { payload: PerformerGameEntry }[]
    unit?: string
}) => {
    const game = payload?.[0]?.payload
    if (!active || !game) return null
    return (
        <div className="rounded-lg border border-foreground/10 bg-card px-3 py-2 text-xs shadow-lg">
            <div className="font-medium">
                {dayLabel(game.date)} vs {game.opponent}
            </div>
            {game.summary && <div className="text-muted-foreground">{game.summary}</div>}
            <div className="mt-1 font-semibold tabular-nums">
                {unit ? `${unit} ${game.trend?.toFixed(3) ?? '—'}` : `${game.points} pts`}
            </div>
        </div>
    )
}

const PointsChart = ({ detail }: { detail: PerformerDetail }) => {
    const data = detail.games.map((game) => ({ ...game, label: dayLabel(game.date) }))
    return (
        <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
                <YAxis tickLine={false} axisLine={false} width={40} />
                <ChartTooltip cursor={false} content={<GameTooltip />} />
                {detail.seasonPointsPerGame !== null && (
                    <ReferenceLine
                        y={detail.seasonPointsPerGame}
                        stroke="var(--muted-foreground)"
                        strokeDasharray="4 4"
                    />
                )}
                <Bar dataKey="points" radius={[4, 4, 0, 0]}>
                    {data.map((game) => (
                        <Cell key={game.date} fill={game.inWindow ? HOT : COOL} />
                    ))}
                </Bar>
            </BarChart>
        </ChartContainer>
    )
}

const TrendChart = ({ games, label }: { games: PerformerGameEntry[]; label: string }) => {
    const data = games.map((game) => ({ ...game, label: dayLabel(game.date) }))
    return (
        <ChartContainer config={{ trend: { label, color: HOT } }} className="aspect-auto h-56 w-full">
            <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    domain={['auto', 'auto']}
                    tickFormatter={(v: number) => v.toFixed(label === 'ERA' ? 1 : 2)}
                />
                <ChartTooltip cursor={false} content={<GameTooltip unit={label} />} />
                <Line
                    type="monotone"
                    dataKey="trend"
                    stroke={HOT}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: HOT }}
                    activeDot={{ r: 5 }}
                />
            </LineChart>
        </ChartContainer>
    )
}

const MixChart = ({ mix }: { mix: PerformerDetail['mix'] }) => {
    const data = [...mix].sort((a, b) => b.points - a.points)
    return (
        <ChartContainer config={chartConfig} className="aspect-auto w-full" style={{ height: 40 + data.length * 30 }}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={104} />
                <Bar dataKey="points" radius={4} barSize={16}>
                    {data.map((part) => (
                        <Cell key={part.label} fill={part.points >= 0 ? HOT : LOSS} />
                    ))}
                    <LabelList dataKey="points" position="right" className="fill-foreground text-xs" />
                </Bar>
            </BarChart>
        </ChartContainer>
    )
}

const Comparison = ({ rows }: { rows: PerformerComparison[] }) =>
    rows.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">Not enough games for a comparison.</p>
    ) : (
        <ul className="space-y-4">
            {rows.map((row) => {
                const max = Math.max(row.window ?? 0, row.season ?? 0) || 1
                const better =
                    row.window !== null &&
                    row.season !== null &&
                    (row.lowerIsBetter ? row.window < row.season : row.window > row.season)
                return (
                    <li key={row.label} className="space-y-1.5">
                        <div className="flex items-baseline justify-between text-sm">
                            <span className="font-medium">{row.label}</span>
                            <span
                                className={cn(
                                    'text-xs font-medium',
                                    better ? 'text-[#16a34a]' : 'text-muted-foreground',
                                )}
                            >
                                {better ? 'Better than usual' : 'Not above usual'}
                            </span>
                        </div>
                        <ValueBar label="This week" value={row.window} max={max} digits={row.digits} color={HOT} />
                        <ValueBar label="Season" value={row.season} max={max} digits={row.digits} color={COOL} />
                    </li>
                )
            })}
        </ul>
    )
