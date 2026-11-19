'use client'

import { useUpcomingGames } from '../model/use-upcoming-games'

import { GameCard } from './game-card'

const dayLabel = (dateKey: string) =>
    new Date(`${dateKey}T12:00:00`).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })

export const GamesHub = () => {
    const { days, isLoading, error } = useUpcomingGames()

    if (isLoading) return <p className="text-sm text-muted-foreground">Loading the schedule…</p>
    if (error) return <p className="text-sm text-[#dc2626]">We could not load the schedule right now.</p>
    if (days.length === 0) {
        return (
            <p className="rounded-lg border border-dashed border-foreground/15 px-4 py-10 text-center text-sm text-muted-foreground">
                No MLB games in the next few days. Check back when the season is on.
            </p>
        )
    }

    return (
        <div className="space-y-6">
            {days.map((day) => (
                <section key={day.dateKey}>
                    <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{dayLabel(day.dateKey)}</h2>
                    <div className="grid gap-3 md:grid-cols-2">
                        {day.games.map((game) => (
                            <GameCard key={game.gamePk} game={game} />
                        ))}
                    </div>
                </section>
            ))}
            <p className="text-xs text-muted-foreground">
                Win estimates are statistical estimates to help fantasy decisions. They are not predictions or betting advice.
            </p>
        </div>
    )
}
