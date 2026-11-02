import type { PrismaClient } from '../../../src/generated/prisma/client'
import { prisma } from '../../lib/prisma'
import { handleRepositoryError } from '../../shared/db/prisma-error.utils'
import { ApiError } from '../../errors/api.error'
import { ErrorCode } from '../../errors/error-code.enum'

import type {
    CreateLeagueMemberAndLinkTeamInput,
    ILeagueMemberRepository,
    LeagueMemberRecord,
} from './league-member.repository.interface'

interface RawLeagueMember {
    id: string
    leagueId: string
    userId: string
    wins: number
    losses: number
    pointsFor: { toNumber: () => number } | number
    createdAt: Date
    updatedAt: Date
}

function toModel(row: RawLeagueMember): LeagueMemberRecord {
    return {
        id: row.id,
        leagueId: row.leagueId,
        userId: row.userId,
        wins: row.wins,
        losses: row.losses,
        pointsFor:
            typeof row.pointsFor === 'number'
                ? row.pointsFor
                : row.pointsFor.toNumber(),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    }
}

export class LeagueMemberRepository implements ILeagueMemberRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async findByLeagueAndUser(
        leagueId: string,
        userId: string,
    ): Promise<LeagueMemberRecord | null> {
        try {
            const row = await this.db.leagueMember.findUnique({
                where: { leagueId_userId: { leagueId, userId } },
            })
            return row ? toModel(row as unknown as RawLeagueMember) : null
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async findByUserId(userId: string): Promise<LeagueMemberRecord[]> {
        try {
            const rows = await this.db.leagueMember.findMany({ where: { userId } })
            return rows.map((row) => toModel(row as unknown as RawLeagueMember))
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async findAllByLeagueId(leagueId: string): Promise<LeagueMemberRecord[]> {
        try {
            const rows = await this.db.leagueMember.findMany({ where: { leagueId } })
            return rows.map((row) => toModel(row as unknown as RawLeagueMember))
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async createAndLinkTeam(
        input: CreateLeagueMemberAndLinkTeamInput,
    ): Promise<LeagueMemberRecord> {
        try {
            const member = await this.db.$transaction(async (tx) => {
                const created = await tx.leagueMember.create({
                    data: {
                        leagueId: input.leagueId,
                        userId: input.userId,
                        wins: 0,
                        losses: 0,
                        pointsFor: 0,
                    },
                })

                const linked = await tx.fantasyTeam.updateMany({
                    where: { id: input.fantasyTeamId, userId: input.userId, leagueMemberId: null },
                    data: { leagueMemberId: created.id },
                })
                if (linked.count !== 1) throw ApiError.conflict(ErrorCode.TEAM_ALREADY_IN_LEAGUE, 'Team is already entered')

                return created
            })

            return toModel(member as unknown as RawLeagueMember)
        } catch (error) {
            if (error instanceof ApiError) throw error
            throw handleRepositoryError(error)
        }
    }
}
