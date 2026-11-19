import { GameDetailPanel } from '@/widgets/games'

export const GameDetailView = ({ gamePk }: { gamePk: number }) => (
    <div className="container mx-auto max-w-3xl px-6 py-6">
        <GameDetailPanel gamePk={gamePk} />
    </div>
)
