import type { BuilderTeam } from './types'

// Maps a top-level fantasy league (the one picked in the League selector) to
// the provider sub-league names that belong to it. The teams catalog tags each
// team with its provider sub-league (e.g. MLB teams carry "American League" /
// "National League"), not the top-level slug — so we bridge the two here.
//
// Only MLB has team data today; the other leagues appear in the selector but
// have no rosters yet, so they intentionally resolve to an empty team list.
export const LEAGUE_TEAM_GROUPS: Record<string, string[]> = {
    mlb: ['American League', 'National League'],
}

// Whether a league has team/player data behind it. Leagues without a backing
// provider are still listed in the picker but shown as "Coming soon".
export function hasLeagueTeamData(leagueSlug: string): boolean {
    return leagueSlug in LEAGUE_TEAM_GROUPS
}

// Teams that belong to the given top-level league. Returns [] when no league is
// selected or the league has no team data, which the Autofill modal renders as
// its empty state.
export function filterTeamsByLeague(
    teams: BuilderTeam[],
    leagueSlug: string | null,
): BuilderTeam[] {
    if (!leagueSlug) return []
    const subLeagues = LEAGUE_TEAM_GROUPS[leagueSlug]
    if (!subLeagues) return []
    return teams.filter((team) => team.league != null && subLeagues.includes(team.league))
}
