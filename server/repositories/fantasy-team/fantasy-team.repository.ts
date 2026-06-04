import { prisma } from '../../lib/prisma'
import type { FantasyTeamWithRoster } from '../../models/fantasy-team/fantasy-team.model'
import { handleRepositoryError } from '../../shared/db/prisma-error.utils'

import type {
    CreateFantasyTeamInput,
    IFantasyTeamRepository,
    ReplaceRosterInput,
} from './fantasy-team.repository.interface'

export class FantasyTeamRepository implements IFantasyTeamRepository {
    async findByUserId(userId: string): Promise<FantasyTeamWithRoster[]> {
        try {
            return await prisma.fantasyTeam.findMany({
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
            return await prisma.fantasyTeam.findUnique({
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
            return await prisma.fantasyTeam.findUnique({
                where: { leagueMemberId },
                include: { rosterSlots: true },
            })
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async updateName(id: string, name: string): Promise<FantasyTeamWithRoster> {
        try {
            return await prisma.fantasyTeam.update({
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
            return await prisma.fantasyTeam.create({
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
            return await prisma.$transaction(async (tx) => {
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
            throw handleRepositoryError(error)
        }
    }
}
