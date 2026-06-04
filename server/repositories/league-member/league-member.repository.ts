import { prisma } from '../../lib/prisma'
import { handleRepositoryError } from '../../shared/db/prisma-error.utils'

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
    async findByLeagueAndUser(
        leagueId: string,
        userId: string,
    ): Promise<LeagueMemberRecord | null> {
        try {
            const row = await prisma.leagueMember.findUnique({
                where: { leagueId_userId: { leagueId, userId } },
            })
            return row ? toModel(row as unknown as RawLeagueMember) : null
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async findByUserId(userId: string): Promise<LeagueMemberRecord[]> {
        try {
            const rows = await prisma.leagueMember.findMany({ where: { userId } })
            return rows.map((row) => toModel(row as unknown as RawLeagueMember))
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async findAllByLeagueId(leagueId: string): Promise<LeagueMemberRecord[]> {
        try {
            const rows = await prisma.leagueMember.findMany({ where: { leagueId } })
            return rows.map((row) => toModel(row as unknown as RawLeagueMember))
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async createAndLinkTeam(
        input: CreateLeagueMemberAndLinkTeamInput,
    ): Promise<LeagueMemberRecord> {
        try {
            const member = await prisma.$transaction(async (tx) => {
                const created = await tx.leagueMember.create({
                    data: {
                        leagueId: input.leagueId,
                        userId: input.userId,
                        wins: 0,
                        losses: 0,
                        pointsFor: 0,
                    },
                })

                await tx.fantasyTeam.update({
                    where: { id: input.fantasyTeamId },
                    data: { leagueMemberId: created.id },
                })

                return created
            })

            return toModel(member as unknown as RawLeagueMember)
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }
}
