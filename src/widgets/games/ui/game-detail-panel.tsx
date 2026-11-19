'use client'

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

import { GameAnalysisButton } from '@/features/game-analysis'
import type { GameLeague } from '@/shared/games'

import { useGameDetail } from '../model/use-game-detail'

import { ConditionsPanel } from './conditions-panel'
import { EstimatePanel } from './estimate-panel'
import { GameHero } from './game-hero'
import { PitchersPanel } from './pitchers-panel'

interface GameDetailPanelProps {
    gamePk: number
    league: GameLeague
}

export const GameDetailPanel = ({ gamePk, league }: GameDetailPanelProps) => {
    const { detail, isLoading, error } = useGameDetail(gamePk, league)

    return (
        <div className="container mx-auto max-w-6xl space-y-6 px-6 py-8">
            <Link
                href="/games"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                All games
            </Link>

            {isLoading ? (
                <div className="space-y-6">
                    <div className="h-80 animate-pulse rounded-3xl bg-muted" />
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="h-96 animate-pulse rounded-2xl bg-muted" />
                        <div className="h-96 animate-pulse rounded-2xl bg-muted" />
                    </div>
                </div>
            ) : error || !detail ? (
                <p className="rounded-2xl border border-dashed border-foreground/15 px-4 py-12 text-center text-sm text-muted-foreground">
                    We could not find this game. It may have been moved or removed from the schedule.
                </p>
            ) : (
                <>
                    <GameHero
                        detail={detail}
                        actions={
                            <GameAnalysisButton
                                game={detail.game}
                                className="border-transparent bg-[#c6f26b] text-[#15211a] shadow-sm hover:bg-[#d6f78f] hover:text-[#15211a]"
                            />
                        }
                    />
                    <div className="grid items-start gap-6 lg:grid-cols-2">
                        <EstimatePanel detail={detail} />
                        <div className="space-y-6">
                            <PitchersPanel detail={detail} />
                            <ConditionsPanel detail={detail} />
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
