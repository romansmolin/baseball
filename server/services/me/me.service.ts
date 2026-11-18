import { ApiError } from '../../errors/api.error'
import { ErrorCode } from '../../errors/error-code.enum'
import { SPORT_LEAGUES } from '../../shared/sport-leagues.const'
import type { FantasyTeamWithRoster } from '../../models/fantasy-team/fantasy-team.model'
import type {
    CreateRosterSlotInput,
    IFantasyTeamRepository,
} from '../../repositories/fantasy-team/fantasy-team.repository.interface'
import {
    PlayerPosition,
    RosterSlotPosition,
} from '../../../src/generated/prisma/enums'
import {
    ROSTER_SIZE,
    SALARY_CAP_DEFAULT,
    slotAcceptsPoolPosition,
} from '@/shared/team-builder'
import type {
    BuilderBudget,
    BuilderRosterSlotPayload,
    CreateTeamPayload,
    CreateTeamResult,
    PoolPosition,
    SlotKey,
    UpdateLineupPayload,
} from '@/shared/team-builder'
import type { MyTeamsPayload, Team } from '@/shared/teams'
import type { IMeService } from './me.service.interface'

const SLOT_KEY_TO_ROSTER_POSITION: Record<SlotKey, RosterSlotPosition> = {
    P: RosterSlotPosition.P,
    C: RosterSlotPosition.C,
    '1B': RosterSlotPosition.FIRST_BASE,
    '2B': RosterSlotPosition.SECOND_BASE,
    '3B': RosterSlotPosition.THIRD_BASE,
    SS: RosterSlotPosition.SS,
    LF: RosterSlotPosition.OF,
    CF: RosterSlotPosition.OF,
    RF: RosterSlotPosition.OF,
}

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

// Non-OF slot positions map 1:1 back to a SlotKey. OF slots are ambiguous —
// DB only stores 'OF', but the team builder expects LF/CF/RF. We distribute
// OF rows across LF→CF→RF in iteration order so all three slots fill in.
const NON_OF_ROSTER_TO_SLOT_KEY: Partial<Record<RosterSlotPosition, SlotKey>> = {
    P: 'P',
    C: 'C',
    FIRST_BASE: '1B',
    SECOND_BASE: '2B',
    THIRD_BASE: '3B',
    SS: 'SS',
}

const OF_SLOT_KEYS: SlotKey[] = ['LF', 'CF', 'RF']

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

    async getBudget(_userId: string): Promise<BuilderBudget> {
        return { salaryCap: SALARY_CAP_DEFAULT }
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
        this.validateLineupPayload(payload.players, payload.captainExternalPlayerId)

        const rosterSlots = payload.players.map((player) =>
            this.toRosterSlotInput(player),
        )

        const created = await this.fantasyTeamRepository.create({
            userId,
            name: payload.name,
            leagueSlug: payload.leagueSlug,
            format: payload.format,
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

        this.validateLineupPayload(payload.players, payload.captainExternalPlayerId)

        const rosterSlots = payload.players.map((player) =>
            this.toRosterSlotInput(player),
        )

        const updated = await this.fantasyTeamRepository.replaceRoster({
            teamId,
            captainExternalPlayerId: payload.captainExternalPlayerId ?? null,
            rosterSlots,
        })

        return this.toWidgetTeam(updated)
    }

    private validateLineupPayload(
        players: BuilderRosterSlotPayload[],
        captainExternalPlayerId: number | undefined,
    ): void {
        const playerIds = new Set(players.map((player) => player.externalPlayerId))
        if (playerIds.size !== players.length) {
            throw ApiError.validationError('A player can occupy only one roster slot')
        }

        const slotKeys = new Set(players.map((player) => player.slotKey))
        if (slotKeys.size !== players.length) {
            throw ApiError.validationError('Each roster position can be used only once')
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

        const salaryUsed = players.reduce(
            (sum, player) => sum + player.salaryAtLock,
            0,
        )

        if (salaryUsed > SALARY_CAP_DEFAULT) {
            throw new ApiError(
                400,
                ErrorCode.BUDGET_EXCEEDED,
                `Lineup salary (${salaryUsed}) exceeds salary cap (${SALARY_CAP_DEFAULT})`,
            )
        }

        if (players.length !== ROSTER_SIZE) {
            throw new ApiError(
                400,
                ErrorCode.INCOMPLETE_ROSTER,
                `Roster must contain exactly ${ROSTER_SIZE} players (got ${players.length})`,
            )
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

    private toRosterSlotInput(
        player: BuilderRosterSlotPayload,
    ): CreateRosterSlotInput {
        return {
            externalPlayerId: player.externalPlayerId,
            playerName: player.name,
            playerPosition: POOL_POSITION_TO_PLAYER_POSITION[player.position],
            playerTeamName: player.teamName,
            slotPosition: SLOT_KEY_TO_ROSTER_POSITION[player.slotKey],
            salaryAtLock: player.salaryAtLock,
        }
    }

    private toWidgetTeam(row: FantasyTeamWithRoster): Team {
        const savedDaysAgo = Math.max(
            0,
            Math.floor((Date.now() - row.createdAt.getTime()) / MS_PER_DAY),
        )

        const captainId = row.captainExternalPlayerId

        // OF slots in the DB collapse LF/CF/RF down to 'OF', but the team
        // builder edit page expects distinct slot keys. Distribute OF rows
        // across LF→CF→RF in iteration order; non-OF slots map 1:1. Without
        // this, only P/C/SS slots survived the team-builder's isSlotKey
        // filter and edits showed only 3 players.
        let ofCursor = 0
        const rosterSlots = row.rosterSlots.map((slot) => {
            const slotKey =
                slot.slotPosition === 'OF'
                    ? (OF_SLOT_KEYS[ofCursor++] ?? 'OF')
                    : (NON_OF_ROSTER_TO_SLOT_KEY[slot.slotPosition] ??
                      String(slot.slotPosition))
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
            leagueMemberId: null,
            name: row.name,
            leagueSlug: row.leagueSlug,
            format: this.toTeamFormat(row.format),
            players: row.rosterSlots.length,
            proj: 0,
            best: 0,
            entered: 0,
            captain: captainId !== null,
            fav: false,
            savedDaysAgo,
            status: 'draft',
            rosterSlots,
        }
    }

    private toTeamFormat(rawFormat: string | null): Team['format'] {
        if (rawFormat === 'Daily' || rawFormat === 'Weekly' || rawFormat === 'Tournament') {
            return rawFormat
        }
        return 'Weekly'
    }
}
