import { GamesResults } from '@/widgets/games-results'
import { StatsNav } from '@/widgets/stats'

export const GamesResultsView = () => (
    <>
        <StatsNav className="max-w-6xl" />
        <main className="container mx-auto max-w-6xl space-y-8 px-6 py-8">
            <p className="max-w-prose text-sm text-muted-foreground">
                These are the real games your fantasy points come from. Check the final scores of the last three days and see which games are next, in MLB and the Winter Leagues.
            </p>
            <GamesResults />
        </main>
    </>
)
