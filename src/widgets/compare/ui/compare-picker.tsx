'use client'

import type { PlayerAnalytics } from '@/shared/analytics'
import { cn } from '@/shared/utils'
import { TeamLogo } from '@/shared/ui'

import { MAX_COMPARE_PLAYERS } from '../model/compare-logic'
import { useComparePicker, type PickedPlayer } from '../model/use-compare-picker'
import { useTeamSlider } from '../model/use-team-slider'

interface ComparePickerProps {
    ids: number[]
    players: PlayerAnalytics[]
    onPick: (id: number) => void
    onRemove: (id: number) => void
}

const initials = (name: string) =>
    name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')

const Avatar = ({ name, photoUrl, className }: { name: string; photoUrl: string | null; className: string }) =>
    photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className={cn('shrink-0 rounded-full object-cover', className)} />
    ) : (
        <span className={cn('flex shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold', className)}>
            {initials(name)}
        </span>
    )

const arrow =
    'hidden size-8 shrink-0 items-center justify-center rounded-full border border-foreground/15 text-muted-foreground hover:bg-muted hover:text-foreground sm:flex'

export const ComparePicker = ({ ids, players, onPick, onRemove }: ComparePickerProps) => {
    const picker = useComparePicker(ids, players, onPick)
    const { trackRef, prev, next } = useTeamSlider()

    return (
        <div className="space-y-4 rounded-xl border border-foreground/10 bg-card p-4">
            <div className="flex min-h-8 flex-wrap items-center gap-2">
                {picker.selected.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Pick a team below, then add players to compare (up to {MAX_COMPARE_PLAYERS}).</span>
                ) : (
                    picker.selected.map((player) => (
                        <span key={player.id} className="flex items-center gap-2 rounded-full bg-muted py-1 pr-1.5 pl-1 text-sm">
                            <Avatar name={player.name} photoUrl={player.photoUrl} className="size-6 text-[10px]" />
                            {player.name}
                            <button
                                type="button"
                                aria-label={`Remove ${player.name}`}
                                onClick={() => onRemove(player.id)}
                                className="rounded-full px-1.5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                            >
                                ×
                            </button>
                        </span>
                    ))
                )}
            </div>

            <div>
                <div className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">Team</div>
                {picker.teamsError ? (
                    <p className="text-sm text-[#dc2626]">Could not load teams. Try again in a moment.</p>
                ) : (
                    <div className="flex items-center gap-2">
                        <button type="button" aria-label="Scroll teams left" onClick={prev} className={arrow}>
                            ‹
                        </button>
                        <div ref={trackRef} className="flex min-w-0 flex-1 snap-x gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {picker.teamsLoading && <span className="py-3 text-sm text-muted-foreground">Loading teams…</span>}
                            {picker.teams.map((team) => (
                                <button
                                    key={team.id}
                                    type="button"
                                    aria-pressed={picker.teamId === team.id}
                                    onClick={() => picker.toggleTeam(team.id)}
                                    className={cn(
                                        'flex w-24 shrink-0 snap-start flex-col items-center gap-1.5 rounded-xl border p-3 text-center hover:bg-muted/50',
                                        picker.teamId === team.id ? 'border-primary bg-muted/60' : 'border-foreground/10',
                                    )}
                                >
                                    <TeamLogo teamId={team.id} label={team.abbreviation} className="size-10" />
                                    <span className="text-xs leading-tight font-medium">{team.name}</span>
                                </button>
                            ))}
                        </div>
                        <button type="button" aria-label="Scroll teams right" onClick={next} className={arrow}>
                            ›
                        </button>
                    </div>
                )}
            </div>

            {picker.teamId !== null && (
                <div>
                    <div className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">Players</div>
                    {picker.rosterLoading && <p className="text-sm text-muted-foreground">Loading roster…</p>}
                    {picker.rosterError && <p className="text-sm text-[#dc2626]">Could not load this roster. Try again in a moment.</p>}
                    {!picker.rosterLoading && !picker.rosterError && picker.roster.length === 0 && (
                        <p className="text-sm text-muted-foreground">No players found for this team.</p>
                    )}
                    <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
                        {picker.roster.map((player) => {
                            const added = ids.includes(player.id)
                            const picked: PickedPlayer = {
                                id: player.id,
                                name: player.name,
                                detail: `${player.pos} · ${player.team}`,
                                photoUrl: player.photoUrl,
                            }
                            return (
                                <button
                                    key={player.id}
                                    type="button"
                                    disabled={added || picker.full}
                                    onClick={() => picker.pick(picked)}
                                    className="flex items-center gap-2 rounded-lg border border-foreground/10 p-2 text-left hover:bg-muted/50 disabled:opacity-50"
                                >
                                    <Avatar name={player.name} photoUrl={player.photoUrl} className="size-9" />
                                    <span className="min-w-0 text-sm">
                                        <span className="block truncate font-medium">{player.name}</span>
                                        <span className="block text-xs text-muted-foreground">{added ? 'Added' : player.pos}</span>
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                    {picker.hiddenCount > 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                            {picker.hiddenCount} {picker.hiddenCount === 1 ? 'player' : 'players'} with no games this season not shown.
                        </p>
                    )}
                    {picker.full && <p className="mt-2 text-xs text-muted-foreground">Up to {MAX_COMPARE_PLAYERS} players. Remove one to add another.</p>}
                </div>
            )}
        </div>
    )
}
