import type { SupportedBaseballLeague } from '../../../src/shared/baseball'
import { env } from '../../lib/env'
import type { Paginated } from '../dto/provider-pagination.dto'
import type { ProviderPlayer, ProviderPlayerFilters } from '../dto/provider-player.dto'
import type {
    GetScheduleFilters,
    ProviderBoxScore,
    ProviderGameStatus,
    ProviderScheduledGame,
} from '../dto/provider-schedule.dto'
import type { ProviderTeam } from '../dto/provider-team.dto'
import type {
    GetBoxScoreOptions,
    GetPlayersByTeamOptions,
    GetTeamByIdOptions,
    GetTeamsFilters,
    ISportsProvider,
} from '../sports-provider.interface'
import { ProviderNotFoundError } from '../sports-provider.error'

import { mlbFetch } from './mlb.client'
import { MLB_PEOPLE_HYDRATE_CHUNK, MLB_REVALIDATE, mlbTags } from './mlb.constants'
import { resolveSportId } from './mlb-leagues.config'
import { mapMlbBoxScoreToProvider } from './mappers/mlb-boxscore.mapper'
import { mapMlbPersonToProviderPlayer } from './mappers/mlb-person.mapper'
import {
    mapMlbDetailedStateToStatus,
    mapMlbScheduleGameToProvider,
} from './mappers/mlb-schedule.mapper'
import { mapMlbTeamToProviderTeam } from './mappers/mlb-team.mapper'
import type { MlbRawBoxScoreResponse } from './types/mlb-boxscore.raw'
import type { MlbRawPeopleResponse, MlbRawPerson } from './types/mlb-person.raw'
import type { MlbRawRosterResponse } from './types/mlb-roster.raw'
import type { MlbRawScheduleResponse } from './types/mlb-schedule.raw'
import type { MlbRawTeamsResponse } from './types/mlb-team.raw'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

// The MLB Stats API serves MLB *and* every Minor League level from the same
// host — the only thing that changes per level is the `sportId` query
// parameter (and, for the players endpoint, the `/sports/{sportId}/` path
// segment). `resolveSportId` maps a league slug to that number and defaults to
// MLB, so every method here stays a single code path regardless of level.
export class MlbSportsProvider implements ISportsProvider {
    readonly name = 'mlb'

    async getTeams(filters: GetTeamsFilters = {}): Promise<ProviderTeam[]> {
        const season = filters.season ?? env.defaultSeason()
        const sportId = resolveSportId(filters.league)
        const path = `/teams?sportId=${sportId}&season=${season}`

        const data = await mlbFetch<MlbRawTeamsResponse>(path, {
            revalidate: MLB_REVALIDATE.teams,
            tags: [mlbTags.teams(sportId, season)],
        })

        const teams = data.teams.map(mapMlbTeamToProviderTeam)
        return filters.activeOnly ? teams.filter((t) => t.active) : teams
    }

    async getTeamById(id: number, opts: GetTeamByIdOptions = {}): Promise<ProviderTeam | null> {
        const season = opts.season ?? env.defaultSeason()
        // `/teams/{id}` is keyed by a globally-unique team id — no sportId needed,
        // and it resolves teams at every level.
        const path = `/teams/${id}?season=${season}`

        try {
            const data = await mlbFetch<MlbRawTeamsResponse>(path, {
                revalidate: MLB_REVALIDATE.team,
                tags: [mlbTags.team(id, season)],
            })
            const raw = data.teams[0]
            return raw ? mapMlbTeamToProviderTeam(raw) : null
        } catch (error) {
            if (error instanceof ProviderNotFoundError) return null
            throw error
        }
    }

    async getPlayers(filters: ProviderPlayerFilters = {}): Promise<Paginated<ProviderPlayer>> {
        const season = filters.season ?? env.defaultSeason()
        const sportId = resolveSportId(filters.league)
        const path = `/sports/${sportId}/players?season=${season}`

        const data = await mlbFetch<MlbRawPeopleResponse>(path, {
            revalidate: MLB_REVALIDATE.players,
            tags: [mlbTags.players(sportId, season)],
        })

        const teamLookup = await this.buildTeamLookup(season, filters.league)

        let players = data.people.map((person) =>
            mapMlbPersonToProviderPlayer(person, { teamLookup }),
        )

        if (filters.teamId != null) {
            players = players.filter((p) => p.teamId === filters.teamId)
        }
        if (filters.position) {
            players = players.filter((p) => p.primaryPosition === filters.position)
        }
        if (filters.search) {
            const needle = filters.search.toLowerCase()
            players = players.filter((p) => p.fullName.toLowerCase().includes(needle))
        }

        const total = players.length
        const limit = clampLimit(filters.limit)
        const offset = Math.max(0, filters.offset ?? 0)
        const items = players.slice(offset, offset + limit)

        return { items, total, limit, offset }
    }

    async getPlayerById(id: number): Promise<ProviderPlayer | null> {
        // `/people/{id}` is level-agnostic. We can't know the player's league
        // here, so the team lookup used to enrich the response is the MLB team
        // set — a MiLB player's team name still resolves via the raw
        // `currentTeam` field, only the abbreviation may be absent.
        const path = `/people/${id}?hydrate=currentTeam`

        try {
            const data = await mlbFetch<MlbRawPeopleResponse>(path, {
                revalidate: MLB_REVALIDATE.person,
                tags: [mlbTags.person(id)],
            })
            const raw = data.people[0]
            if (!raw) return null

            const teamId = raw.currentTeam?.id ?? null
            const teamLookup =
                teamId != null ? await this.buildTeamLookup(env.defaultSeason()) : undefined

            return mapMlbPersonToProviderPlayer(raw, { teamLookup })
        } catch (error) {
            if (error instanceof ProviderNotFoundError) return null
            throw error
        }
    }

    async getPlayersByIds(ids: number[]): Promise<ProviderPlayer[]> {
        if (ids.length === 0) return []
        // Bulk `/people?personIds=…&hydrate=currentTeam` — one call per 100
        // ids. No team lookup: callers of this path only need `teamId`
        // (from the hydrated currentTeam), not the display name/abbreviation.
        const peopleById = await this.hydratePeople(ids)
        return Array.from(peopleById.values()).map((raw) =>
            mapMlbPersonToProviderPlayer(raw),
        )
    }

    async getPlayersByTeam(
        teamId: number,
        opts: GetPlayersByTeamOptions = {},
    ): Promise<ProviderPlayer[]> {
        const season = opts.season ?? env.defaultSeason()
        const rosterType = opts.rosterType ?? 'active'
        // Roster + team-by-id endpoints are keyed by the unique team id and
        // resolve at every level, so no sportId is threaded here.
        const path = `/teams/${teamId}/roster?rosterType=${rosterType}&season=${season}`

        const roster = await mlbFetch<MlbRawRosterResponse>(path, {
            revalidate: MLB_REVALIDATE.roster,
            tags: [mlbTags.roster(teamId, season)],
        })

        if (roster.roster.length === 0) return []

        const team = await this.getTeamById(teamId, { season, league: opts.league })
        const teamLookup = team ? new Map<number, ProviderTeam>([[team.id, team]]) : undefined

        const personIds = roster.roster.map((entry) => entry.person.id)
        const peopleById = await this.hydratePeople(personIds)

        return roster.roster.map((entry) => {
            const raw =
                peopleById.get(entry.person.id) ??
                ({
                    id: entry.person.id,
                    fullName: entry.person.fullName,
                    primaryPosition: entry.position,
                } satisfies MlbRawPerson)

            return mapMlbPersonToProviderPlayer(raw, {
                teamLookup,
                teamId,
                rosterEntry: entry,
            })
        })
    }

    async getSchedule(filters: GetScheduleFilters): Promise<ProviderScheduledGame[]> {
        const startStr = toDateOnly(filters.startDateUtc)
        const endStr = toDateOnly(filters.endDateUtc)
        const sportId = resolveSportId(filters.league)
        const season = filters.season ?? env.defaultSeason()

        const teamIds =
            filters.teamIds && filters.teamIds.length > 0
                ? [...new Set(filters.teamIds)]
                : filters.teamId != null
                  ? [filters.teamId]
                  : []
        const teamKey = teamIds.length > 0 ? teamIds.join(',') : undefined

        let path = `/schedule?sportId=${sportId}&season=${season}&startDate=${startStr}&endDate=${endStr}`
        if (teamKey) {
            path += `&teamId=${teamKey}`
        }

        const data = await mlbFetch<MlbRawScheduleResponse>(path, {
            revalidate: MLB_REVALIDATE.schedule,
            tags: [mlbTags.schedule(sportId, startStr, endStr, teamKey)],
        })

        const games: ProviderScheduledGame[] = []
        for (const date of data.dates) {
            for (const game of date.games) {
                games.push(mapMlbScheduleGameToProvider(game))
            }
        }
        return games
    }

    async getBoxScore(
        gamePk: number,
        opts: GetBoxScoreOptions = {},
    ): Promise<ProviderBoxScore | null> {
        // The /boxscore endpoint doesn't include the game's lifecycle status,
        // so we resolve it via a targeted schedule lookup (which the MLB API
        // supports via the gamePks query param). The sportId must match the
        // game's level or the schedule filter excludes it — hence the league
        // option threaded from the caller.
        const sportId = resolveSportId(opts.league)
        let status: ProviderGameStatus
        try {
            const scheduleData = await mlbFetch<MlbRawScheduleResponse>(
                `/schedule?sportId=${sportId}&gamePks=${gamePk}`,
                {
                    revalidate: MLB_REVALIDATE.schedule,
                    tags: [mlbTags.boxscore(gamePk)],
                },
            )
            const game = scheduleData.dates.flatMap((d) => d.games).find((g) => g.gamePk === gamePk)
            if (!game) return null
            status = mapMlbDetailedStateToStatus(
                game.status.detailedState,
                game.status.abstractGameState,
            )
        } catch (error) {
            if (error instanceof ProviderNotFoundError) return null
            throw error
        }

        try {
            const data = await mlbFetch<MlbRawBoxScoreResponse>(`/game/${gamePk}/boxscore`, {
                revalidate: MLB_REVALIDATE.boxscore,
                tags: [mlbTags.boxscore(gamePk)],
            })
            return mapMlbBoxScoreToProvider(data, gamePk, status)
        } catch (error) {
            if (error instanceof ProviderNotFoundError) return null
            throw error
        }
    }

    private async buildTeamLookup(
        season: number,
        league?: SupportedBaseballLeague,
    ): Promise<Map<number, ProviderTeam>> {
        const teams = await this.getTeams({ season, league })
        return new Map(teams.map((t) => [t.id, t]))
    }

    private async hydratePeople(ids: number[]): Promise<Map<number, MlbRawPerson>> {
        const result = new Map<number, MlbRawPerson>()
        const unique = Array.from(new Set(ids))

        for (let i = 0; i < unique.length; i += MLB_PEOPLE_HYDRATE_CHUNK) {
            const chunk = unique.slice(i, i + MLB_PEOPLE_HYDRATE_CHUNK)
            const path = `/people?personIds=${chunk.join(',')}&hydrate=currentTeam`
            const data = await mlbFetch<MlbRawPeopleResponse>(path, {
                revalidate: MLB_REVALIDATE.person,
                tags: chunk.map((id) => mlbTags.person(id)),
            })
            for (const person of data.people) result.set(person.id, person)
        }

        return result
    }
}

function clampLimit(limit: number | undefined): number {
    if (limit == null) return DEFAULT_LIMIT
    return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)))
}

// The MLB /schedule endpoint takes YYYY-MM-DD strings, not full ISO
// timestamps. Slicing the ISO string keeps the conversion UTC-stable.
function toDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10)
}
