'use client'

import { ArrowLeft01Icon, ArrowRight01Icon, ChartLineData01Icon, StarIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useState } from 'react'

import { useWeeklyPerformersData } from '@/entities/performers'
import { usePerformerAnalytics } from '@/features/performer-analytics'
import type { PerformerGroup, TopPerformer } from '@/shared/performers'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { PlayerAvatar } from '@/shared/ui/player-avatar'
import { cn } from '@/shared/utils'

import { statLabel } from '../model/performer-labels'
import { useSlider } from '../model/use-slider'

import { PerformerModal, type SelectedPerformer } from './performer-modal'

const LIMIT = 8

export const TopPerformers = () => {
    const { data, error, isLoading } = useWeeklyPerformersData(LIMIT)
    // `selected` outlives the modal so it can animate out without losing its content.
    const [selected, setSelected] = useState<SelectedPerformer | null>(null)
    const [open, setOpen] = useState(false)
    const onSelect = (next: SelectedPerformer) => {
        setSelected(next)
        setOpen(true)
    }

    return (
        <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    Top performers this week
                    <HugeiconsIcon icon={StarIcon} className="size-4 text-muted-foreground" />
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                    Last 7 days, ranked by fantasy points. Unlock a card&apos;s analytics to see why.
                </span>
            </CardHeader>
            <CardContent className="flex flex-col gap-8">
                {error ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground">Couldn&apos;t load player stats.</div>
                ) : (
                    <>
                        <PerformerSlider
                            title="Hitters"
                            group="hitting"
                            players={data?.hitters}
                            loading={isLoading}
                            onSelect={onSelect}
                        />
                        <PerformerSlider
                            title="Pitchers"
                            group="pitching"
                            players={data?.pitchers}
                            loading={isLoading}
                            onSelect={onSelect}
                        />
                    </>
                )}
            </CardContent>
            <PerformerModal selected={selected} open={open} onClose={() => setOpen(false)} />
        </Card>
    )
}

interface PerformerSliderProps {
    title: string
    group: PerformerGroup
    players: TopPerformer[] | undefined
    loading: boolean
    onSelect: (selected: SelectedPerformer) => void
}

const PerformerSlider = ({ title, group, players, loading, onSelect }: PerformerSliderProps) => {
    const { trackRef, atStart, atEnd, prev, next } = useSlider(players?.length ?? 0)

    return (
        <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{title}</h3>
                <div className="flex gap-1.5">
                    <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Previous ${title.toLowerCase()}`}
                        disabled={atStart}
                        onClick={prev}
                    >
                        <HugeiconsIcon icon={ArrowLeft01Icon} />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Next ${title.toLowerCase()}`}
                        disabled={atEnd}
                        onClick={next}
                    >
                        <HugeiconsIcon icon={ArrowRight01Icon} />
                    </Button>
                </div>
            </div>

            <div
                ref={trackRef}
                className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {loading ? (
                    [0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)
                ) : !players || players.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground">No games played this week.</div>
                ) : (
                    players.map((player, index) => (
                        <PerformerCard
                            key={player.playerId}
                            player={player}
                            rank={index + 1}
                            group={group}
                            onOpen={() => onSelect({ player, group })}
                        />
                    ))
                )}
            </div>
        </section>
    )
}

const CARD_WIDTH = 'w-[17.5rem] shrink-0 snap-start sm:w-[19rem]'

interface PerformerCardProps {
    player: TopPerformer
    rank: number
    group: PerformerGroup
    onOpen: () => void
}

const PerformerCard = ({ player, rank, group, onOpen }: PerformerCardProps) => {
    const a = usePerformerAnalytics({ playerId: player.playerId, league: player.league, group })
    const unlocked = a.analytics !== null
    const title = unlocked
        ? `Open ${player.name}'s analytics`
        : a.canAfford
          ? `Unlock analytics for ${a.cost} credits`
          : `You need ${a.cost} credits to unlock analytics${a.balance !== undefined ? ` (you have ${a.balance.toLocaleString()})` : ''}`

    return (
        <article
            className={cn(
                CARD_WIDTH,
                'flex flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-card transition-shadow hover:shadow-md',
            )}
        >
            <div
                className={cn(
                    'relative flex items-end gap-4 px-5 pt-5 pb-4',
                    group === 'hitting' ? 'bg-primary/10' : 'bg-accent/10',
                )}
            >
                <span className="absolute top-3 right-4 text-5xl leading-none font-black text-foreground/10 tabular-nums">
                    {rank}
                </span>
                <PlayerAvatar
                    playerId={player.playerId}
                    name={player.name}
                    className="size-20 border-4 border-card shadow-sm"
                />
                <div className="min-w-0 pb-1">
                    <div className="text-3xl leading-none font-bold tabular-nums">{player.points}</div>
                    <div className="mt-1 text-xs text-muted-foreground">fantasy points</div>
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-4 p-5">
                <div className="min-w-0">
                    <div className="truncate text-base leading-tight font-semibold">{player.name}</div>
                    <div className="truncate text-sm text-muted-foreground">
                        {[player.position, player.teamName].filter(Boolean).join(' · ')}
                    </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {player.stats.map((stat) => (
                        <div key={stat.label} className="min-w-0">
                            <dt className="truncate text-xs text-muted-foreground">{statLabel(stat.label)}</dt>
                            <dd className="text-lg leading-tight font-semibold tabular-nums">{stat.value}</dd>
                        </div>
                    ))}
                </dl>

                <Button
                    className="mt-auto w-full"
                    variant={unlocked ? 'outline' : 'default'}
                    disabled={!unlocked && !a.canAfford}
                    title={title}
                    onClick={onOpen}
                >
                    <HugeiconsIcon icon={ChartLineData01Icon} className="size-4" />
                    {unlocked ? 'Open analytics' : `Analytics · ${a.cost} credits`}
                </Button>
            </div>
        </article>
    )
}

const CardSkeleton = () => <div className={cn(CARD_WIDTH, 'h-[22rem] animate-pulse rounded-2xl bg-muted')} />
