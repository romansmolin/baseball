interface PlayersHeaderProps {
    totalPlayers: number
}

export const PlayersHeader = ({ totalPlayers }: PlayersHeaderProps) => (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
            <h1 className="font-anton text-3xl tracking-wide">Players</h1>
            <p className="mt-1 text-sm text-muted-foreground">
                Scout the pool —{' '}
                <span className="font-medium text-foreground">{totalPlayers}</span>
                {' players, stats, injuries & transfers.'}
            </p>
        </div>
    </div>
)
