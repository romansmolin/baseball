import type { PrismaClient } from '../../../src/generated/prisma/client'
import { prisma } from '../../lib/prisma'
import type { FantasyTeamWithRoster } from '../../models/fantasy-team/fantasy-team.model'
import { handleRepositoryError } from '../../shared/db/prisma-error.utils'
import { ApiError } from '../../errors/api.error'
import { ErrorCode } from '../../errors/error-code.enum'

import type {
    CreateFantasyTeamInput,
    IFantasyTeamRepository,
    ReplaceRosterInput,
} from './fantasy-team.repository.interface'

export class FantasyTeamRepository implements IFantasyTeamRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async findByUserId(userId: string): Promise<FantasyTeamWithRoster[]> {
        try {
            return await this.db.fantasyTeam.findMany({
                where: { userId },
                include: { rosterSlots: true },
                orderBy: { updatedAt: 'desc' },
            })
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async findById(id: string): Promise<FantasyTeamWithRoster | null> {
        try {
            return await this.db.fantasyTeam.findUnique({
                where: { id },
                include: { rosterSlots: true },
            })
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async findByLeagueMemberId(
        leagueMemberId: string,
    ): Promise<FantasyTeamWithRoster | null> {
        try {
            return await this.db.fantasyTeam.findUnique({
                where: { leagueMemberId },
                include: { rosterSlots: true },
            })
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async updateName(id: string, name: string): Promise<FantasyTeamWithRoster> {
        try {
            return await this.db.fantasyTeam.update({
                where: { id },
                data: { name },
                include: { rosterSlots: true },
            })
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async create(input: CreateFantasyTeamInput): Promise<FantasyTeamWithRoster> {
        try {
            return await this.db.fantasyTeam.create({
                data: {
                    userId: input.userId,
                    name: input.name,
                    leagueSlug: input.leagueSlug,
                    format: input.format,
                    captainExternalPlayerId: input.captainExternalPlayerId,
                    rosterSlots: {
                        create: input.rosterSlots.map((slot) => ({
                            externalPlayerId: slot.externalPlayerId,
                            playerName: slot.playerName,
                            playerPosition: slot.playerPosition,
                            playerTeamName: slot.playerTeamName,
                            slotPosition: slot.slotPosition,
                            salaryAtLock: slot.salaryAtLock,
                        })),
                    },
                },
                include: { rosterSlots: true },
            })
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async replaceRoster(input: ReplaceRosterInput): Promise<FantasyTeamWithRoster> {
        try {
            // Single transaction so we never leave a team in a half-replaced
            // state. We do NOT touch WeeklyLineup here — historical snapshots
            // stay frozen; only the live RosterSlots are swapped.
            return await this.db.$transaction(async (tx) => {
                await tx.$queryRaw`SELECT id FROM "FantasyTeam" WHERE id=${input.teamId} FOR UPDATE`
                const current = await tx.fantasyTeam.findUnique({
                    where: { id: input.teamId },
                    select: {
                        leagueMember: {
                            select: {
                                league: {
                                    select: { recurringTournament: { select: { leagueId: true } } },
                                },
                            },
                        },
                    },
                })
                if (current?.leagueMember?.league.recurringTournament) throw ApiError.conflict(ErrorCode.TEAM_ALREADY_IN_LEAGUE, 'Team joined a recurring tournament; reload the lineup editor')
                await tx.rosterSlot.deleteMany({
                    where: { fantasyTeamId: input.teamId },
                })

                await tx.rosterSlot.createMany({
                    data: input.rosterSlots.map((slot) => ({
                        fantasyTeamId: input.teamId,
                        externalPlayerId: slot.externalPlayerId,
                        playerName: slot.playerName,
                        playerPosition: slot.playerPosition,
                        playerTeamName: slot.playerTeamName,
                        slotPosition: slot.slotPosition,
                        salaryAtLock: slot.salaryAtLock,
                    })),
                })

                return tx.fantasyTeam.update({
                    where: { id: input.teamId },
                    data: {
                        captainExternalPlayerId: input.captainExternalPlayerId,
                    },
                    include: { rosterSlots: true },
                })
            })
        } catch (error) {
            if (error instanceof ApiError) throw error
            throw handleRepositoryError(error)
        }
    }
}
