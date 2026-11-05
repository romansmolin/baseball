'use client'

import type { BuilderLeague, BuilderTeam } from '@/shared/team-builder'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

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
    const leaguePlaceholder = leaguesLoading
        ? 'Loading…'
        : leagues.length === 0
          ? 'No leagues available'
          : 'Select a league'
    const teamPlaceholder = !selectedLeagueSlug
        ? 'Pick a league first'
        : teamsLoading
          ? 'Loading…'
          : teamEmptyForLeague
            ? 'No teams available for this league yet'
            : 'Select a team'

    return (
        <section className="rounded-2xl border border-foreground/10 bg-card p-4">
            <div className="mb-3 font-medium">Pick a league & team</div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                    <label className="mb-1.5 block text-xs text-muted-foreground" htmlFor="league-select">
                        League
                    </label>
                    <Select
                        items={[{ value: null, label: leaguePlaceholder }, ...leagues.map((league) => ({ value: league.slug, label: league.providerBacked ? league.name : `${league.name} (Coming soon)` }))]}
                        value={selectedLeagueSlug}
                        disabled={leagueDisabled}
                        onValueChange={(value) => onLeagueChange(value)}
                    >
                        <SelectTrigger id="league-select" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={null}>{leaguePlaceholder}</SelectItem>
                            {leagues.map((league) => (
                                <SelectItem key={league.slug} value={league.slug} disabled={!league.providerBacked}>
                                    {league.providerBacked ? league.name : `${league.name} (Coming soon)`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
                    <Select
                        items={[{ value: null, label: teamPlaceholder }, ...teams.map((team) => ({ value: team.id, label: team.name }))]}
                        value={selectedTeamId}
                        disabled={teamDisabled}
                        onValueChange={(value) => onTeamChange(value)}
                    >
                        <SelectTrigger id="team-select" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={null}>{teamPlaceholder}</SelectItem>
                            {teams.map((team) => (
                                <SelectItem key={team.id} value={team.id}>
                                    {team.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
