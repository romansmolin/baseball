import { GamesResults } from '@/widgets/games-results'

export const GamesResultsView = () => (
    <main className="container mx-auto max-w-6xl space-y-8 px-6 py-8">
        <header>
            <h1 className="font-anton text-4xl tracking-wide">Games</h1>
            <p className="mt-1 text-sm text-muted-foreground">
                Live scores and results from the last three days, plus what&apos;s next.
            </p>
        </header>
        <GamesResults />
    </main>
)
