import { GamePicksPanel } from '@/features/game-picks'
import type { GameLeague } from '@/shared/games'
import { GameDetailPanel } from '@/widgets/games'

export const GameDetailView = ({ gamePk, league }: { gamePk: number; league: GameLeague }) => (
    <div className="container mx-auto max-w-3xl px-6 py-6">
        <GameDetailPanel gamePk={gamePk} league={league} actions={<GamePicksPanel gamePk={gamePk} />} />
    </div>
)
