import { CONFIDENCE_LABEL, formatScore, type PlayerAnalytics } from '@/shared/analytics'
import { cn } from '@/shared/utils'

interface CompareSummaryProps {
    players: PlayerAnalytics[]
    leads: number[]
    contested: number
    outlookBest: Set<number>
    onRemove: (id: number) => void
}

const initials = (name: string) =>
    name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')

export const CompareSummary = ({ players, leads, contested, outlookBest, onRemove }: CompareSummaryProps) => {
    const topLead = Math.max(...leads)

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {players.map((p, index) => {
                    const leader = contested > 0 && leads[index] === topLead && topLead > 0
                    return (
                        <div
                            key={p.player.id}
                            className={cn('rounded-xl border bg-card p-3', leader ? 'border-[#22c55e]/50' : 'border-foreground/10')}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                    {p.player.photoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={p.player.photoUrl} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                                    ) : (
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                                            {initials(p.player.fullName)}
                                        </span>
                                    )}
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium">{p.player.fullName}</div>
                                        <div className="truncate text-xs text-muted-foreground">
                                            {p.player.position} · {p.player.teamAbbreviation ?? '—'}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    aria-label={`Remove ${p.player.fullName}`}
                                    onClick={() => onRemove(p.player.id)}
                                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="mt-3 flex items-end justify-between gap-2">
                                <div>
                                    <div
                                        className={cn(
                                            'font-anton text-3xl leading-none tabular-nums',
                                            outlookBest.has(index) && 'text-[#16a34a]',
                                        )}
                                    >
                                        {formatScore(p.outlook.score)}
                                    </div>
                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                        Outlook · {CONFIDENCE_LABEL[p.outlook.confidence]}
                                    </div>
                                </div>
                                {contested > 0 && (
                                    <div className={cn('text-right text-xs whitespace-nowrap', leader ? 'font-semibold text-[#16a34a]' : 'text-muted-foreground')}>
                                        Leads {leads[index]} of {contested}
                                        <div className="font-normal text-muted-foreground">key stats</div>
                                    </div>
                                )}
                            </div>
                            <div className="mt-2 truncate text-[11px] text-muted-foreground">{p.status.description}</div>
                        </div>
                    )
                })}
            </div>
            <p className="text-xs text-muted-foreground">
                Outlook is a 0–100 rating built from season OPS (hitters) or ERA (pitchers), nudged by recent form, platoon and expected
                stats. “Leads” counts the key stats below where a player has the best value.
            </p>
        </div>
    )
}
