'use client'

import type { BuilderLeague, BuilderTeam } from '@/shared/team-builder'
import { cn } from '@/shared/utils'

interface LeagueTeamSelectorProps {
    leagues: BuilderLeague[]
    teams: BuilderTeam[]
    selectedLeagueSlug: string | null
    selectedTeamId: number | null
    leaguesLoading: boolean
    teamsLoading: boolean
    leaguesError: Error | undefined
    teamsError: Error | undefined
    onLeagueChange: (slug: string | null) => void
    onTeamChange: (id: number | null) => void
    onLeaguesRetry: () => void
    onTeamsRetry: () => void
}

const SELECT_CLASSES =
    'h-9 w-full rounded-md border border-foreground/15 bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60'

export const LeagueTeamSelector = ({
    leagues,
    teams,
    selectedLeagueSlug,
    selectedTeamId,
    leaguesLoading,
    teamsLoading,
    leaguesError,
    teamsError,
    onLeagueChange,
    onTeamChange,
    onLeaguesRetry,
    onTeamsRetry,
}: LeagueTeamSelectorProps) => {
    const leagueDisabled = leaguesLoading || !!leaguesError || leagues.length === 0
    const teamDisabled =
        teamsLoading || !!teamsError || !selectedLeagueSlug || teams.length === 0

    const teamEmptyForLeague =
        !!selectedLeagueSlug && !teamsLoading && !teamsError && teams.length === 0

    return (
        <section className="rounded-2xl border border-foreground/10 bg-card p-4">
            <div className="mb-3 font-medium">Pick a league & team</div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                    <label className="mb-1.5 block text-xs text-muted-foreground" htmlFor="league-select">
                        League
                    </label>
                    <select
                        id="league-select"
                        className={cn(SELECT_CLASSES)}
                        value={selectedLeagueSlug ?? ''}
                        disabled={leagueDisabled}
                        onChange={(e) => {
                            const value = e.target.value
                            onLeagueChange(value === '' ? null : value)
                        }}
                    >
                        <option value="">
                            {leaguesLoading
                                ? 'Loading…'
                                : leagues.length === 0
                                  ? 'No leagues available'
                                  : 'Select a league'}
                        </option>
                        {leagues.map((league) => {
                            const available = league.providerBacked
                            return (
                                <option
                                    key={league.slug}
                                    value={league.slug}
                                    disabled={!available}
                                >
                                    {available
                                        ? league.name
                                        : `${league.name} (Coming soon)`}
                                </option>
                            )
                        })}
                    </select>
                    {leaguesError ? (
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-destructive">
                            <span>Failed to load leagues.</span>
                            <button
                                type="button"
                                onClick={onLeaguesRetry}
                                className="rounded-md border border-foreground/15 px-2 py-0.5 text-xs transition-colors hover:bg-muted"
                            >
                                Retry
                            </button>
                        </div>
                    ) : null}
                </div>

                <div>
                    <label className="mb-1.5 block text-xs text-muted-foreground" htmlFor="team-select">
                        Team
                    </label>
                    <select
                        id="team-select"
                        className={cn(SELECT_CLASSES)}
                        value={selectedTeamId ?? ''}
                        disabled={teamDisabled}
                        onChange={(e) => {
                            const value = e.target.value
                            onTeamChange(value === '' ? null : Number(value))
                        }}
                    >
                        <option value="">
                            {!selectedLeagueSlug
                                ? 'Pick a league first'
                                : teamsLoading
                                  ? 'Loading…'
                                  : teamEmptyForLeague
                                    ? 'No teams available for this league yet'
                                    : 'Select a team'}
                        </option>
                        {teams.map((team) => (
                            <option key={team.id} value={team.id}>
                                {team.name}
                            </option>
                        ))}
                    </select>
                    {teamsError ? (
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-destructive">
                            <span>Failed to load teams.</span>
                            <button
                                type="button"
                                onClick={onTeamsRetry}
                                className="rounded-md border border-foreground/15 px-2 py-0.5 text-xs transition-colors hover:bg-muted"
                            >
                                Retry
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </section>
    )
}
