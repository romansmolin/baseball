import type { StandingGroup } from '@/shared/stats'
import { TeamLogo } from '@/shared/ui/team-logo'
import { cn } from '@/shared/utils'

const abbreviation = (name: string) => name.split(' ').map((word) => word[0]).join('').slice(0, 3)

/** One table per division, with each team's record and run difference. */
export function StandingsTable({ group }: { group: StandingGroup }) {
    return (
        <section aria-labelledby={`standings-${group.id}`} className="overflow-hidden rounded-lg border border-border bg-card">
            <h3 id={`standings-${group.id}`} className="border-b border-border px-4 py-3 font-anton text-xl uppercase leading-none">{group.name}</h3>
            <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                    <tr className="border-b border-border">
                        <th scope="col" className="w-8 py-2 pl-4 font-medium"><span className="sr-only">Rank</span></th>
                        <th scope="col" className="py-2 font-medium">Team</th>
                        <th scope="col" className="px-2 py-2 text-right font-medium"><abbr title="Wins" className="no-underline">W</abbr></th>
                        <th scope="col" className="px-2 py-2 text-right font-medium"><abbr title="Losses" className="no-underline">L</abbr></th>
                        <th scope="col" className="px-2 py-2 text-right font-medium"><abbr title="Winning percentage" className="no-underline">Pct</abbr></th>
                        <th scope="col" className="hidden px-2 py-2 text-right font-medium sm:table-cell"><abbr title="Games behind the leader" className="no-underline">GB</abbr></th>
                        <th scope="col" className="px-2 py-2 text-right font-medium"><abbr title="Runs scored minus runs allowed" className="no-underline">Diff</abbr></th>
                        <th scope="col" className="hidden py-2 pr-4 pl-2 text-right font-medium sm:table-cell">Streak</th>
                    </tr>
                </thead>
                <tbody>
                    {group.rows.map((row, index) => (
                        <tr key={row.teamId} className="border-b border-border last:border-b-0">
                            <td className="py-2.5 pl-4 font-anton text-lg tabular-nums text-muted-foreground">{index + 1}</td>
                            <td className="py-2.5">
                                <span className="flex items-center gap-2.5 font-medium">
                                    <TeamLogo teamId={row.teamId} label={abbreviation(row.name)} />
                                    <span className="truncate">{row.name}</span>
                                </span>
                            </td>
                            <td className="px-2 py-2.5 text-right tabular-nums">{row.wins}</td>
                            <td className="px-2 py-2.5 text-right tabular-nums">{row.losses}</td>
                            <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{row.pct}</td>
                            <td className="hidden px-2 py-2.5 text-right tabular-nums sm:table-cell">{row.gamesBack}</td>
                            <td className={cn('px-2 py-2.5 text-right tabular-nums', row.runDifferential > 0 && 'font-medium text-board', row.runDifferential < 0 && 'text-muted-foreground')}>{row.runDifferential > 0 ? `+${row.runDifferential}` : row.runDifferential}</td>
                            <td className="hidden py-2.5 pr-4 pl-2 text-right tabular-nums sm:table-cell">{row.streak ?? '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    )
}
