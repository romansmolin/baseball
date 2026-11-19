import type { GameLeague } from '@/shared/games'
import { GameDetailPanel } from '@/widgets/games'

export const GameDetailView = ({ gamePk, league }: { gamePk: number; league: GameLeague }) => (
    <GameDetailPanel gamePk={gamePk} league={league} />
)
