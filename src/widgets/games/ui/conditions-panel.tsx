import { type GameDetail } from '@/shared/analytics'

const Item = ({ label, value, note }: { label: string; value: string; note: string }) => (
    <div className="rounded-xl bg-muted/50 p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-base font-semibold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
)

export const ConditionsPanel = ({ detail }: { detail: GameDetail }) => {
    const { weather } = detail

    return (
        <section className="space-y-4 rounded-2xl border border-foreground/10 bg-card p-6">
            <div>
                <h2 className="text-lg font-bold">Conditions</h2>
                <p className="text-xs text-muted-foreground">What can change how the game plays out.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <Item
                    label="Lineups"
                    value={detail.lineupsPosted ? 'Posted' : 'Not posted yet'}
                    note={
                        detail.lineupsPosted
                            ? 'Batting orders are set. Check your players are in.'
                            : 'Teams usually post a few hours before first pitch.'
                    }
                />
                <Item
                    label="Weather"
                    value={
                        weather?.condition
                            ? `${weather.condition}${weather.tempF !== null ? `, ${weather.tempF}°F` : ''}`
                            : 'Not available'
                    }
                    note={weather?.wind ? `Wind ${weather.wind}` : 'Wind and temperature affect home runs.'}
                />
            </div>
        </section>
    )
}
