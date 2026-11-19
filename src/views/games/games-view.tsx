import { GamesHub } from '@/widgets/games'

export const GamesView = () => (
    <div className="container mx-auto max-w-5xl space-y-5 px-6 py-6">
        <div>
            <h1 className="font-anton text-3xl tracking-wide">Upcoming games</h1>
            <p className="text-sm text-muted-foreground">Probable starters, weather and a win estimate for every game.</p>
        </div>
        <GamesHub />
    </div>
)
