import { ApiError } from '../../errors/api.error'
import { ErrorCode } from '../../errors/error-code.enum'
import { SPORT_LEAGUES } from '../../shared/sport-leagues.const'
import type { FantasyTeamWithRoster } from '../../models/fantasy-team/fantasy-team.model'
import type {
    CreateRosterSlotInput,
    FantasyTeamSettingsInput,
    IFantasyTeamRepository,
} from '../../repositories/fantasy-team/fantasy-team.repository.interface'
import {
    PlayerPosition,
    RosterSlotPosition,
} from '../../../src/generated/prisma/enums'
import {
    DEFAULT_SCORING_RULES,
    DEFAULT_SLOT_CONFIG,
    buildSlots,
    parseSlotId,
    slotAcceptsPoolPosition,
    toSlotId,
} from '@/shared/team-builder'
import type {
    BuilderBudget,
    BuilderRosterSlotPayload,
    CreateTeamPayload,
    CreateTeamResult,
    PoolPosition,
    ScoringRules,
    SlotConfig,
    SlotType,
    TeamSettings,
    UpdateLineupPayload,
} from '@/shared/team-builder'
import type { MyTeamsPayload, Team } from '@/shared/teams'
import type { IMeService } from './me.service.interface'

const SLOT_TYPE_TO_ROSTER_POSITION: Record<SlotType, RosterSlotPosition> = {
    P: RosterSlotPosition.P,
    C: RosterSlotPosition.C,
    '1B': RosterSlotPosition.FIRST_BASE,
    '2B': RosterSlotPosition.SECOND_BASE,
    '3B': RosterSlotPosition.THIRD_BASE,
    SS: RosterSlotPosition.SS,
    OF: RosterSlotPosition.OF,
    UTIL: RosterSlotPosition.UTIL,
    BENCH: RosterSlotPosition.BENCH,
}

const ROSTER_POSITION_TO_SLOT_TYPE = Object.fromEntries(
    Object.entries(SLOT_TYPE_TO_ROSTER_POSITION).map(([type, position]) => [position, type]),
) as Record<RosterSlotPosition, SlotType>

const POOL_POSITION_TO_PLAYER_POSITION: Record<PoolPosition, PlayerPosition> = {
    P: PlayerPosition.P,
    C: PlayerPosition.C,
    '1B': PlayerPosition.FIRST_BASE,
    '2B': PlayerPosition.SECOND_BASE,
    '3B': PlayerPosition.THIRD_BASE,
    SS: PlayerPosition.SS,
    OF: PlayerPosition.OF,
}

// Reverse of POOL_POSITION_TO_PLAYER_POSITION for normalizing API responses
// back to the shorthand the team-builder UI expects. The DB enum has more
// values (LF/CF/RF/DH/IF/UTIL) — we collapse the outfield variants and the
// utility variants down to the closest PoolPosition.
const PLAYER_POSITION_TO_POOL_POSITION: Partial<
    Record<PlayerPosition, PoolPosition>
> = {
    P: 'P',
    C: 'C',
    FIRST_BASE: '1B',
    SECOND_BASE: '2B',
    THIRD_BASE: '3B',
    SS: 'SS',
    LF: 'OF',
    CF: 'OF',
    RF: 'OF',
    OF: 'OF',
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

export class MeService implements IMeService {
    private readonly fantasyTeamRepository: IFantasyTeamRepository

    constructor(fantasyTeamRepository: IFantasyTeamRepository) {
        this.fantasyTeamRepository = fantasyTeamRepository
    }

    async getMyTeams(userId: string): Promise<MyTeamsPayload> {
        const rows = await this.fantasyTeamRepository.findByUserId(userId)
        return {
            teams: rows.map((row) => this.toWidgetTeam(row)),
            leagues: SPORT_LEAGUES,
        }
    }

    // Points formats have no salary cap; real caps arrive with DFS slates.
    async getBudget(_userId: string): Promise<BuilderBudget> {
        return { salaryCap: null }
    }

    async renameMyTeam(userId: string, teamId: string, name: string): Promise<Team> {
        const existing = await this.fantasyTeamRepository.findById(teamId)
        if (!existing) {
            throw new ApiError(404, ErrorCode.TEAM_NOT_FOUND, `Team not found: ${teamId}`)
        }
        if (existing.userId !== userId) {
            throw new ApiError(403, ErrorCode.TEAM_NOT_OWNED, `Team ${teamId} is not owned by this user`)
        }

        const updated = await this.fantasyTeamRepository.updateName(teamId, name)
        return this.toWidgetTeam(updated)
    }

    async createMyTeam(
        userId: string,
        payload: CreateTeamPayload,
    ): Promise<CreateTeamResult> {
        const settings = this.resolveSettings(payload)
        this.validateLineupPayload(
            payload.players,
            payload.captainExternalPlayerId,
            settings,
        )

        const rosterSlots = payload.players.map((player) =>
            this.toRosterSlotInput(player),
        )

        const created = await this.fantasyTeamRepository.create({
            userId,
            name: payload.name,
            leagueSlug: payload.leagueSlug,
            platform: payload.platform,
            settings,
            captainExternalPlayerId: payload.captainExternalPlayerId,
            rosterSlots,
        })

        return {
            id: created.id,
            name: created.name,
            leagueSlug: created.leagueSlug,
        }
    }

    async updateMyTeamLineup(
        userId: string,
        teamId: string,
        payload: UpdateLineupPayload,
    ): Promise<Team> {
        const existing = await this.fantasyTeamRepository.findById(teamId)
        if (!existing) {
            throw new ApiError(
                404,
                ErrorCode.TEAM_NOT_FOUND,
                `Team not found: ${teamId}`,
            )
        }
        if (existing.userId !== userId) {
            throw new ApiError(
                403,
                ErrorCode.TEAM_NOT_OWNED,
                `Team ${teamId} is not owned by this user`,
            )
        }

        // Settings that were not sent stay as saved.
        const { format, forecastPeriod, lineupChanges, scoringRules, slotConfig, salaryCap } = payload
        const settings: FantasyTeamSettingsInput = {
            ...this.settingsOf(existing),
            ...definedOnly({ format, forecastPeriod, lineupChanges, scoringRules, slotConfig, salaryCap }),
        }
        this.validateLineupPayload(
            payload.players,
            payload.captainExternalPlayerId,
            settings,
        )

        const rosterSlots = payload.players.map((player) =>
            this.toRosterSlotInput(player),
        )

        const updated = await this.fantasyTeamRepository.replaceRoster({
            teamId,
            captainExternalPlayerId: payload.captainExternalPlayerId ?? null,
            platform: payload.platform,
            settings,
            rosterSlots,
        })

        return this.toWidgetTeam(updated)
    }

    private validateLineupPayload(
        players: BuilderRosterSlotPayload[],
        captainExternalPlayerId: number | undefined,
        settings: FantasyTeamSettingsInput,
    ): void {
        const playerIds = new Set(players.map((player) => player.externalPlayerId))
        if (playerIds.size !== players.length) {
            throw ApiError.validationError('A player can occupy only one roster slot')
        }

        const slotKeys = new Set(players.map((player) => player.slotKey))
        if (slotKeys.size !== players.length) {
            throw ApiError.validationError('Each roster position can be used only once')
        }

        const validSlotIds = new Set(buildSlots(settings.slotConfig).map((slot) => slot.id))
        const unknownSlot = players.find((player) => !validSlotIds.has(player.slotKey))
        if (unknownSlot) {
            throw ApiError.validationError(
                `${unknownSlot.slotKey} is not a slot in this lineup`,
            )
        }

        const ineligible = players.find(
            (player) =>
                !slotAcceptsPoolPosition(player.slotKey, player.position),
        )
        if (ineligible) {
            throw ApiError.validationError(
                `${ineligible.position} is not eligible for ${ineligible.slotKey}`,
            )
        }

        if (settings.salaryCap !== null) {
            const salaryUsed = players.reduce(
                (sum, player) => sum + (player.salaryAtLock ?? 0),
                0,
            )
            if (salaryUsed > settings.salaryCap) {
                throw new ApiError(
                    400,
                    ErrorCode.BUDGET_EXCEEDED,
                    `Lineup salary (${salaryUsed}) exceeds salary cap (${settings.salaryCap})`,
                )
            }
        }

        if (captainExternalPlayerId !== undefined) {
            const captainMatches = players.some(
                (player) => player.externalPlayerId === captainExternalPlayerId,
            )
            if (!captainMatches) {
                throw ApiError.validationError(
                    'captainExternalPlayerId must match one of the players in the lineup',
                )
            }
        }
    }

    private resolveSettings(
        payload: Partial<TeamSettings>,
    ): FantasyTeamSettingsInput {
        return {
            format: payload.format ?? 'H2H_POINTS',
            forecastPeriod: payload.forecastPeriod ?? 'WEEK',
            lineupChanges: payload.lineupChanges ?? 'DAILY',
            scoringRules: payload.scoringRules ?? DEFAULT_SCORING_RULES,
            slotConfig: payload.slotConfig ?? DEFAULT_SLOT_CONFIG,
            salaryCap: payload.salaryCap ?? null,
        }
    }

    // `{}` and `[]` are stored for teams saved before settings existed.
    private settingsOf(row: FantasyTeamWithRoster): FantasyTeamSettingsInput {
        const rules = row.scoringRules as unknown as ScoringRules | Record<string, never>
        const slotConfig = row.slotConfig as unknown as SlotConfig
        return {
            format: row.format,
            forecastPeriod: row.forecastPeriod,
            lineupChanges: row.lineupChanges,
            scoringRules: 'hitting' in rules ? (rules as ScoringRules) : DEFAULT_SCORING_RULES,
            slotConfig: slotConfig.length > 0 ? slotConfig : DEFAULT_SLOT_CONFIG,
            salaryCap: row.salaryCap,
        }
    }

    private toRosterSlotInput(
        player: BuilderRosterSlotPayload,
    ): CreateRosterSlotInput {
        const slot = parseSlotId(player.slotKey)
        if (!slot) {
            throw ApiError.validationError(`Invalid slot: ${player.slotKey}`)
        }
        return {
            externalPlayerId: player.externalPlayerId,
            playerName: player.name,
            playerPosition: POOL_POSITION_TO_PLAYER_POSITION[player.position],
            playerTeamName: player.teamName,
            slotPosition: SLOT_TYPE_TO_ROSTER_POSITION[slot.type],
            slotIndex: slot.index,
            salaryAtLock: player.salaryAtLock,
        }
    }

    private toWidgetTeam(row: FantasyTeamWithRoster): Team {
        const savedDaysAgo = Math.max(
            0,
            Math.floor((Date.now() - row.createdAt.getTime()) / MS_PER_DAY),
        )

        const captainId = row.captainExternalPlayerId

        // Teams saved before slot indexes existed hold several rows with the
        // same (type, index 0). Give colliding rows the next free index, in
        // creation order, so LF/CF/RF (OF:0/1/2) come back distinct.
        const used = new Set<string>()
        const ordered = [...row.rosterSlots].sort(
            (a, b) =>
                a.createdAt.getTime() - b.createdAt.getTime() ||
                a.id.localeCompare(b.id),
        )
        const rosterSlots = ordered.map((slot) => {
            const type = ROSTER_POSITION_TO_SLOT_TYPE[slot.slotPosition]
            let index = slot.slotIndex
            while (used.has(toSlotId(type, index))) index++
            const slotKey = toSlotId(type, index)
            used.add(slotKey)
            const playerPos =
                PLAYER_POSITION_TO_POOL_POSITION[slot.playerPosition] ??
                String(slot.playerPosition)

            return {
                id: slot.id,
                externalPlayerId: slot.externalPlayerId,
                playerName: slot.playerName,
                playerPosition: playerPos,
                playerTeamName: slot.playerTeamName,
                playerPhotoUrl: slot.playerPhotoUrl ?? null,
                slotPosition: slotKey,
                salaryAtLock: slot.salaryAtLock,
                isCaptain:
                    captainId !== null && slot.externalPlayerId === captainId,
            }
        })

        return {
            id: row.id,
            name: row.name,
            leagueSlug: row.leagueSlug,
            platform: row.platform,
            ...this.settingsOf(row),
            isComplete:
                buildSlots(this.settingsOf(row).slotConfig).length ===
                row.rosterSlots.length,
            players: row.rosterSlots.length,
            proj: 0,
            captain: captainId !== null,
            fav: false,
            savedDaysAgo,
            rosterSlots,
        }
    }
}

function definedOnly<T extends object>(value: T): Partial<T> {
    return Object.fromEntries(
        Object.entries(value).filter(([, entry]) => entry !== undefined),
    ) as Partial<T>
}
