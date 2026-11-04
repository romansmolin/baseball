'use client'

import { StandingsTable } from '@/entities/stats'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/utils'

import { useStandingsPicker } from '../model/use-standings-picker'

export function StatsStandings() {
    const picker = useStandingsPicker()

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8">
            <p className="max-w-prose text-sm text-muted-foreground">
                Wins and losses of every team in the leagues our contests are built from. Pick a league to see its table.
            </p>
            <div role="group" aria-label="Choose a league" className="flex flex-wrap gap-2">
                {picker.sources.map((source) => (
                    <button
                        key={source.slug}
                        type="button"
                        aria-pressed={picker.league === source.slug}
                        onClick={() => picker.setLeague(source.slug)}
                        className={cn(
                            'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                            picker.league === source.slug ? 'border-board bg-board text-board-foreground' : 'border-border bg-card hover:border-board',
                        )}
                    >
                        {source.label}
                    </button>
                ))}
            </div>
            {picker.isLoading ? (
                <div role="status" aria-label="Loading standings" className="space-y-3">
                    {[0, 1].map((i) => <div key={i} className="h-48 animate-pulse rounded-lg bg-muted/60" />)}
                </div>
            ) : picker.failed ? (
                <div role="alert">
                    <p className="text-sm font-medium">We couldn’t load this table.</p>
                    <p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={picker.retry}>Try again</Button>
                </div>
            ) : picker.groups.length === 0 ? (
                <p className="max-w-prose text-sm text-muted-foreground">This league has no games played yet this season. Pick another league, or come back when its season starts.</p>
            ) : (
                <>
                    <p className="text-sm text-muted-foreground">Season {picker.season}{picker.season !== new Date().getFullYear() && ' (the latest finished season)'}</p>
                    <div className={cn('grid gap-6', picker.groups.length > 1 && 'lg:grid-cols-2')}>
                    {picker.groups.map((group) => <StandingsTable key={group.id} group={group} />)}
                    </div>
                </>
            )}
        </div>
    )
}
