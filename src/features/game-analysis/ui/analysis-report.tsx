import type { UpcomingGameRecord } from '@/shared/games'
import { cn } from '@/shared/utils'

import type { AnalysisPitcher, GameAnalysis, PickRole } from '../model/types'

const ROLE_LABEL: Record<PickRole, string> = { start: 'Start', sit: 'Sit', watch: 'Watch' }
const ROLE_STYLE: Record<PickRole, string> = {
    start: 'bg-[#22c55e]/10 text-[#16a34a]',
    sit: 'bg-[#ef4444]/12 text-[#dc2626]',
    watch: 'bg-muted text-muted-foreground',
}

const pct = (value: number) => Math.round(value * 100)

export const AnalysisReport = ({ game, analysis }: { game: UpcomingGameRecord; analysis: GameAnalysis }) => (
    <div className="space-y-6">
        <Result game={game} analysis={analysis} />
        <Section title="Starting pitchers">
            <div className="grid gap-3 sm:grid-cols-2">
                <Starter team={game.awayTeam.abbreviation} pitcher={analysis.matchup.starters.away} />
                <Starter team={game.homeTeam.abbreviation} pitcher={analysis.matchup.starters.home} />
            </div>
            {analysis.matchup.weather?.condition && (
                <p className="mt-2 text-xs text-muted-foreground">
                    Weather: {analysis.matchup.weather.condition}
                    {analysis.matchup.weather.tempF !== null && `, ${analysis.matchup.weather.tempF}°F`}, wind{' '}
                    {analysis.matchup.weather.wind}
                </p>
            )}
        </Section>
        <Section title="What shapes this game">
            <ul className="space-y-2">
                {analysis.keyFactors.map((factor) => (
                    <li key={factor.title} className="text-sm">
                        <span className="font-medium">{factor.title}.</span>{' '}
                        <span className="text-muted-foreground">{factor.detail}</span>
                    </li>
                ))}
            </ul>
        </Section>
        <Section title="Players to take">
            <ul className="space-y-2">
                {analysis.picks.map((pick) => (
                    <li key={pick.playerId} className="flex gap-3 rounded-lg border border-foreground/10 p-3">
                        <span
                            className={cn('h-fit rounded-full px-2 py-0.5 text-xs font-medium', ROLE_STYLE[pick.role])}
                        >
                            {ROLE_LABEL[pick.role]}
                        </span>
                        <div className="min-w-0 text-sm">
                            <div className="font-medium">{pick.playerName}</div>
                            <div className="text-muted-foreground">{pick.reason}</div>
                        </div>
                    </li>
                ))}
            </ul>
        </Section>
        <p className="text-xs text-muted-foreground">AI suggestions for fantasy decisions, not betting advice.</p>
    </div>
)

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
        <h3 className="mb-2 text-sm font-semibold">{title}</h3>
        {children}
    </section>
)

const Result = ({ game, analysis }: { game: UpcomingGameRecord; analysis: GameAnalysis }) => {
    const { lean, homeWinProbability, confidence, factors } = analysis.matchup
    const home = homeWinProbability === null ? null : pct(homeWinProbability)
    const headline =
        lean === 'toss-up'
            ? 'Too close to call'
            : `${lean === 'home' ? game.homeTeam.name : game.awayTeam.name} favoured`

    return (
        <section className="space-y-3 rounded-xl bg-muted/50 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{headline}</h3>
                {confidence && <span className="text-xs text-muted-foreground">Confidence: {confidence}</span>}
            </div>
            {home !== null && (
                <div className="space-y-1">
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                        <div className="bg-foreground/30" style={{ width: `${100 - home}%` }} />
                        <div className="bg-primary" style={{ width: `${home}%` }} />
                    </div>
                    <div className="flex justify-between text-xs font-medium tabular-nums">
                        <span>
                            {game.awayTeam.abbreviation} {100 - home}%
                        </span>
                        <span>
                            {game.homeTeam.abbreviation} {home}%
                        </span>
                    </div>
                </div>
            )}
            <p className="text-sm">{analysis.summary}</p>
            <p className="text-sm text-muted-foreground">{analysis.outlook}</p>
            {factors.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {factors.map((factor) => (
                        <span key={factor.label} className="rounded-full bg-background px-2 py-0.5 text-xs">
                            {factor.label}{' '}
                            <span
                                className={cn(
                                    'font-medium tabular-nums',
                                    factor.effect >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]',
                                )}
                            >
                                {factor.effect >= 0 ? '+' : ''}
                                {(factor.effect * 100).toFixed(1)}
                            </span>
                        </span>
                    ))}
                </div>
            )}
            {factors.length > 0 && (
                <p className="text-xs text-muted-foreground">
                    Chips show how each factor moves the home team&apos;s win chance, in percentage points.
                </p>
            )}
        </section>
    )
}

const Starter = ({ team, pitcher }: { team: string; pitcher: AnalysisPitcher | null }) => (
    <div className="rounded-lg border border-foreground/10 p-3 text-sm">
        <div className="text-xs text-muted-foreground">{team}</div>
        {pitcher ? (
            <>
                <div className="font-medium">{pitcher.name}</div>
                <div className="text-xs text-muted-foreground tabular-nums">
                    {pitcher.era !== null ? `${pitcher.era.toFixed(2)} ERA` : 'ERA —'}
                    {pitcher.inningsPitched !== null && ` · ${Math.round(pitcher.inningsPitched)} IP`}
                    {pitcher.throws && ` · throws ${pitcher.throws}`}
                </div>
            </>
        ) : (
            <div className="text-muted-foreground">Starter TBD</div>
        )}
    </div>
)
