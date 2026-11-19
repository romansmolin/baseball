import { notFound } from 'next/navigation'

import { GameDetailView } from '@/views/games/game-detail-view'

export default async function GameDetailPage({ params }: { params: Promise<{ gamePk: string }> }) {
    const gamePk = Number((await params).gamePk)
    if (!Number.isInteger(gamePk) || gamePk <= 0) notFound()
    return <GameDetailView gamePk={gamePk} />
}
