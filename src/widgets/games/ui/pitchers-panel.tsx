import { formatDecimal, formatInnings, type GameDetail, type PitcherSummary } from '@/shared/analytics'
import { cn } from '@/shared/utils'

const Row = ({ label, value, better }: { label: string; value: string; better?: boolean }) => (
    <div className="flex justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-semibold tabular-nums', better && 'text-[#16a34a]')}>{value}</span>
    </div>
)

const Side = ({
    abbreviation,
    pitcher,
    betterEra,
}: {
    abbreviation: string
    pitcher: PitcherSummary | null
    betterEra: boolean
}) => (
    <div className="min-w-0 flex-1 space-y-3 rounded-xl bg-muted/50 p-4">
        <div>
            <div className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{abbreviation}</div>
            <div className="truncate text-base font-semibold">{pitcher?.fullName ?? 'To be announced'}</div>
        </div>
        {pitcher && (
            <div className="space-y-1.5">
                <Row label="Throws" value={pitcher.throws === 'L' ? 'Left' : pitcher.throws === 'R' ? 'Right' : '—'} />
                <Row label="ERA" value={formatDecimal(pitcher.era)} better={betterEra} />
                <Row label="Innings" value={formatInnings(pitcher.inningsPitched)} />
            </div>
        )}
    </div>
)

export const PitchersPanel = ({ detail }: { detail: GameDetail }) => {
    const { away, home } = detail.probablePitchers
    const bothEra = away?.era != null && home?.era != null && away.era !== home.era
    const awayBetter = bothEra && (away?.era ?? 0) < (home?.era ?? 0)
    const homeBetter = bothEra && !awayBetter

    return (
        <section className="space-y-4 rounded-2xl border border-foreground/10 bg-card p-6">
            <div>
                <h2 className="text-lg font-bold">Starting pitchers</h2>
                <p className="text-xs text-muted-foreground">
                    The starter sets the tone: a low ERA means fewer runs allowed. The better ERA is in green.
                </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
                <Side abbreviation={detail.game.awayTeam.abbreviation} pitcher={away} betterEra={awayBetter} />
                <Side abbreviation={detail.game.homeTeam.abbreviation} pitcher={home} betterEra={homeBetter} />
            </div>
        </section>
    )
}
