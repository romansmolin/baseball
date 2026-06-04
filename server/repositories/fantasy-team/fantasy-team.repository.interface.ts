import type { PlayerPosition, RosterSlotPosition } from '../../../src/generated/prisma/enums'
import type { FantasyTeamWithRoster } from '../../models/fantasy-team/fantasy-team.model'

export interface CreateRosterSlotInput {
    externalPlayerId: number
    playerName: string
    playerPosition: PlayerPosition
    playerTeamName: string
    slotPosition: RosterSlotPosition
    salaryAtLock: number
}

export interface CreateFantasyTeamInput {
    userId: string
    name: string
    leagueSlug: string
    format?: string
    captainExternalPlayerId?: number
    rosterSlots: CreateRosterSlotInput[]
}

export interface ReplaceRosterInput {
    teamId: string
    captainExternalPlayerId: number | null
    rosterSlots: CreateRosterSlotInput[]
}

export interface IFantasyTeamRepository {
    findByUserId(userId: string): Promise<FantasyTeamWithRoster[]>
    findById(id: string): Promise<FantasyTeamWithRoster | null>
    findByLeagueMemberId(
        leagueMemberId: string,
    ): Promise<FantasyTeamWithRoster | null>
    create(input: CreateFantasyTeamInput): Promise<FantasyTeamWithRoster>
    updateName(id: string, name: string): Promise<FantasyTeamWithRoster>
    /**
     * Replace the live roster of an existing FantasyTeam: deletes every
     * existing RosterSlot for the team, recreates from the supplied set, and
     * updates the captain pointer. Runs in a single transaction. Does NOT
     * touch already-locked WeeklyLineup snapshots — only the mutable
     * "current/upcoming" lineup is replaced.
     */
    replaceRoster(input: ReplaceRosterInput): Promise<FantasyTeamWithRoster>
}
