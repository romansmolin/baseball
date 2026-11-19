import type { Prisma, PrismaClient } from '../../../src/generated/prisma/client'
import { prisma } from '../../lib/prisma'
import type { FantasyTeamWithRoster } from '../../models/fantasy-team/fantasy-team.model'
import { handleRepositoryError } from '../../shared/db/prisma-error.utils'
import { ApiError } from '../../errors/api.error'
import { ErrorCode } from '../../errors/error-code.enum'

import type {
    CreateFantasyTeamInput,
    FantasyTeamSettingsInput,
    IFantasyTeamRepository,
    ReplaceRosterInput,
} from './fantasy-team.repository.interface'

// ScoringRules and SlotConfig are plain JSON; Prisma just cannot see that.
function settingsData(settings: Partial<FantasyTeamSettingsInput>) {
    return {
        ...settings,
        scoringRules: settings.scoringRules as unknown as Prisma.InputJsonValue | undefined,
        slotConfig: settings.slotConfig as unknown as Prisma.InputJsonValue | undefined,
        categories: settings.categories as unknown as Prisma.InputJsonValue | undefined,
    }
}

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
                    platform: input.platform,
                    ...settingsData(input.settings ?? {}),
                    captainExternalPlayerId: input.captainExternalPlayerId,
                    rosterSlots: {
                        create: input.rosterSlots.map((slot) => ({
                            externalPlayerId: slot.externalPlayerId,
                            playerName: slot.playerName,
                            playerPosition: slot.playerPosition,
                            playerTeamName: slot.playerTeamName,
                            slotPosition: slot.slotPosition,
                            slotIndex: slot.slotIndex,
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
            // Single transaction so we never leave a team in a half-replaced state.
            return await this.db.$transaction(async (tx) => {
                await tx.$queryRaw`SELECT id FROM "FantasyTeam" WHERE id=${input.teamId} FOR UPDATE`
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
                        slotIndex: slot.slotIndex,
                        salaryAtLock: slot.salaryAtLock,
                    })),
                })

                return tx.fantasyTeam.update({
                    where: { id: input.teamId },
                    data: {
                        captainExternalPlayerId: input.captainExternalPlayerId,
                        platform: input.platform,
                        ...settingsData(input.settings ?? {}),
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
