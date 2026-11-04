interface PlayersHeaderProps {
    totalPlayers: number
}

export const PlayersHeader = ({ totalPlayers }: PlayersHeaderProps) => (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
            <p className="text-sm text-muted-foreground">
                Scout the pool —{' '}
                <span className="font-medium text-foreground">{totalPlayers}</span>
                {' players and official season statistics.'}
            </p>
        </div>
    </div>
)
