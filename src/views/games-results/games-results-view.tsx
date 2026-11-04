import { GamesResults } from '@/widgets/games-results'
import { StatsNav } from '@/widgets/stats'

export const GamesResultsView = () => (
    <>
        <StatsNav className="max-w-6xl" />
        <main className="container mx-auto max-w-6xl space-y-8 px-6 py-8">
            <p className="text-sm text-muted-foreground">
                Live scores and results from the last three days, plus what&apos;s next. MLB and the Winter Leagues.
            </p>
            <GamesResults />
        </main>
    </>
)
