import type { ProviderPlayer } from '../../dto/provider-player.dto'
import type { ProviderTeam } from '../../dto/provider-team.dto'
import type { MlbRawPerson } from '../types/mlb-person.raw'
import type { MlbRawRosterEntry } from '../types/mlb-roster.raw'
import {
    mapMlbBatSide,
    mapMlbPositionToPosition,
    mapMlbThrowHand,
} from './mlb-position.mapper'

export interface MapPersonContext {
    teamLookup?: Map<number, ProviderTeam>
    rosterEntry?: MlbRawRosterEntry
    teamId?: number
}

export function mapMlbPersonToProviderPlayer(
    raw: MlbRawPerson,
    ctx: MapPersonContext = {},
): ProviderPlayer {
    const teamId = ctx.teamId ?? raw.currentTeam?.id ?? null
    const team = teamId != null ? ctx.teamLookup?.get(teamId) ?? null : null

    const positionAbbr = ctx.rosterEntry?.position?.abbreviation ?? raw.primaryPosition?.abbreviation

    return {
        id: raw.id,
        fullName: raw.fullName,
        firstName: raw.firstName ?? deriveFirstName(raw.fullName),
        lastName: raw.lastName ?? deriveLastName(raw.fullName),
        primaryPosition: mapMlbPositionToPosition(positionAbbr),
        teamId,
        teamName: team?.name ?? raw.currentTeam?.name ?? null,
        teamAbbreviation: team?.abbreviation ?? null,
        birthDate: raw.birthDate ?? null,
        age: raw.currentAge ?? null,
        bats: mapMlbBatSide(raw.batSide?.code),
        throws: mapMlbThrowHand(raw.pitchHand?.code),
        jerseyNumber: ctx.rosterEntry?.jerseyNumber ?? raw.primaryNumber ?? null,
        photoUrl: `https://midfield.mlbstatic.com/v1/people/${raw.id}/spots/120`,
        active: raw.active ?? true,
    }
}

function deriveFirstName(fullName: string): string {
    const idx = fullName.indexOf(' ')
    return idx === -1 ? fullName : fullName.slice(0, idx)
}

function deriveLastName(fullName: string): string {
    const idx = fullName.indexOf(' ')
    return idx === -1 ? '' : fullName.slice(idx + 1)
}
