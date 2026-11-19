import { notFound } from 'next/navigation'

import { GAME_LEAGUES, type GameLeague } from '@/shared/games'
import { GameDetailView } from '@/views/games/game-detail-view'

export default async function GameDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ gamePk: string }>
    searchParams: Promise<{ league?: string }>
}) {
    const gamePk = Number((await params).gamePk)
    const requested = (await searchParams).league
    const league: GameLeague = GAME_LEAGUES.find((l) => l === requested) ?? 'mlb'
    if (!Number.isInteger(gamePk) || gamePk <= 0) notFound()
    return <GameDetailView gamePk={gamePk} league={league} />
}
