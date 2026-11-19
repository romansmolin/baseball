import type {
    FantasyFormat,
    FantasyPlatform,
    ForecastPeriod,
    LineupChanges,
    PlayerPosition,
    RosterSlotPosition,
} from '../../../src/generated/prisma/enums'
import type { ScoringRules, SlotConfig } from '@/shared/team-builder'
import type { FantasyTeamWithRoster } from '../../models/fantasy-team/fantasy-team.model'

export interface CreateRosterSlotInput {
    externalPlayerId: number
    playerName: string
    playerPosition: PlayerPosition
    playerTeamName: string
    slotPosition: RosterSlotPosition
    slotIndex: number
    salaryAtLock: number | null
}

export interface FantasyTeamSettingsInput {
    format: FantasyFormat
    forecastPeriod: ForecastPeriod
    lineupChanges: LineupChanges
    scoringRules: ScoringRules
    slotConfig: SlotConfig
    salaryCap: number | null
}

export interface CreateFantasyTeamInput {
    userId: string
    name: string
    leagueSlug: string
    platform?: FantasyPlatform
    settings: FantasyTeamSettingsInput
    captainExternalPlayerId?: number
    rosterSlots: CreateRosterSlotInput[]
}

export interface ReplaceRosterInput {
    teamId: string
    // Left as saved when omitted.
    platform?: FantasyPlatform
    settings?: Partial<FantasyTeamSettingsInput>
    captainExternalPlayerId: number | null
    rosterSlots: CreateRosterSlotInput[]
}

export interface IFantasyTeamRepository {
    findByUserId(userId: string): Promise<FantasyTeamWithRoster[]>
    findById(id: string): Promise<FantasyTeamWithRoster | null>
    create(input: CreateFantasyTeamInput): Promise<FantasyTeamWithRoster>
    updateName(id: string, name: string): Promise<FantasyTeamWithRoster>
    /**
     * Replace the live roster of an existing FantasyTeam: deletes every
     * existing RosterSlot for the team, recreates from the supplied set, and
     * updates the captain pointer. Runs in a single transaction.
     */
    replaceRoster(input: ReplaceRosterInput): Promise<FantasyTeamWithRoster>
}
