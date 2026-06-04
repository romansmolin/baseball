interface LeaguesHeaderProps {
    totalLeagues: number
    liveLeagues: number
}

export const LeaguesHeader = ({ totalLeagues, liveLeagues }: LeaguesHeaderProps) => (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
            <h1 className="font-anton text-3xl tracking-wide">Leagues</h1>
            <p className="mt-1 text-sm text-muted-foreground">
                Explore every league you can play —{' '}
                <span className="font-medium text-foreground">{totalLeagues}</span> leagues,{' '}
                <span className="font-medium text-foreground">{liveLeagues}</span> in season right now.
            </p>
        </div>
    </div>
)
