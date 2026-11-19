import { CONFIDENCE_LABEL, type PlayerAnalytics } from '@/shared/analytics'
import { cn } from '@/shared/utils'

import { bestIndexes } from '../model/compare-logic'
import { COMPARE_SECTIONS } from '../model/compare-rows'

interface CompareTableProps {
    players: PlayerAnalytics[]
    onRemove: (id: number) => void
}

const initials = (name: string) =>
    name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')

export const CompareTable = ({ players, onRemove }: CompareTableProps) => (
    <div className="overflow-x-auto rounded-xl border border-foreground/10 bg-card">
        <table className="w-full min-w-[560px] text-sm">
            <thead>
                <tr className="border-b border-foreground/10 align-bottom">
                    <th className="sticky left-0 w-44 bg-card p-3" />
                    {players.map((p) => (
                        <th key={p.player.id} className="p-3 text-left font-normal">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                    {p.player.photoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={p.player.photoUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                                    ) : (
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                                            {initials(p.player.fullName)}
                                        </span>
                                    )}
                                    <div className="min-w-0">
                                        <div className="truncate font-medium">{p.player.fullName}</div>
                                        <div className="truncate text-xs text-muted-foreground">
                                            {p.player.position} · {p.player.teamAbbreviation ?? '—'} · {p.status.description}
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
                            <div className="mt-1 text-[11px] text-muted-foreground">{CONFIDENCE_LABEL[p.outlook.confidence]}</div>
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {COMPARE_SECTIONS.map((section) => (
                    <SectionRows key={section.title} section={section} players={players} />
                ))}
            </tbody>
        </table>
    </div>
)

const SectionRows = ({ section, players }: { section: (typeof COMPARE_SECTIONS)[number]; players: PlayerAnalytics[] }) => (
    <>
        <tr>
            <th
                colSpan={players.length + 1}
                className="bg-muted/40 px-3 py-1.5 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
            >
                {section.title}
            </th>
        </tr>
        {section.rows.map((row) => {
            const values = players.map((p) => row.value(p))
            const best = bestIndexes(values, row.better)
            return (
                <tr key={row.key} className="border-b border-foreground/5 last:border-0">
                    <td className="sticky left-0 bg-card px-3 py-2 text-muted-foreground">{row.label}</td>
                    {values.map((value, index) => (
                        <td
                            key={players[index].player.id}
                            className={cn(
                                'px-3 py-2 font-mono tabular-nums',
                                best.has(index) && 'bg-[#22c55e]/10 font-semibold text-[#16a34a]',
                            )}
                        >
                            {row.format(value)}
                        </td>
                    ))}
                </tr>
            )
        })}
    </>
)
