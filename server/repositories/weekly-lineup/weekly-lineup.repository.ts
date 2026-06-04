import type { Prisma } from '../../../src/generated/prisma/client'
import { prisma } from '../../lib/prisma'
import { handleRepositoryError } from '../../shared/db/prisma-error.utils'

import type {
    CreateWeeklyLineupInput,
    IWeeklyLineupRepository,
    WeeklyLineupRecord,
    WeeklyLineupSlotRecord,
} from './weekly-lineup.repository.interface'

// Row shape returned by `prisma.weeklyLineup.findUnique({ include: { slots: true } })`.
// Use Prisma's GetPayload helper so `row.slots` is correctly typed without
// leaking inferred-from-method-signature shapes.
type WeeklyLineupRow = Prisma.WeeklyLineupGetPayload<{
    include: { slots: true }
}>

type WeeklyLineupSlotRow = Prisma.WeeklyLineupSlotGetPayload<true>

export class WeeklyLineupRepository implements IWeeklyLineupRepository {
    async findByMemberAndWeek(
        memberId: string,
        week: number,
    ): Promise<WeeklyLineupRecord | null> {
        try {
            const row = await prisma.weeklyLineup.findUnique({
                where: { leagueMemberId_week: { leagueMemberId: memberId, week } },
                include: { slots: true },
            })
            return row ? this.toRecord(row) : null
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async findManyByMember(memberId: string): Promise<WeeklyLineupRecord[]> {
        try {
            const rows = await prisma.weeklyLineup.findMany({
                where: { leagueMemberId: memberId },
                include: { slots: true },
                orderBy: { week: 'asc' },
            })
            return rows.map((row) => this.toRecord(row))
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async createIfMissing(
        input: CreateWeeklyLineupInput,
    ): Promise<WeeklyLineupRecord> {
        try {
            // Up-front read: if a row already exists, return it as-is. The
            // first snapshot wins — never overwrite a locked week. Concurrency
            // is handled below via the unique-violation fallback.
            const existing = await prisma.weeklyLineup.findUnique({
                where: {
                    leagueMemberId_week: {
                        leagueMemberId: input.leagueMemberId,
                        week: input.week,
                    },
                },
                include: { slots: true },
            })
            if (existing) return this.toRecord(existing)

            try {
                const row = await prisma.weeklyLineup.create({
                    data: {
                        leagueMemberId: input.leagueMemberId,
                        week: input.week,
                        captainExternalPlayerId: input.captainExternalPlayerId,
                        lockedAt: input.lockedAt,
                        slots: {
                            create: input.slots.map((slot) => ({
                                externalPlayerId: slot.externalPlayerId,
                                playerName: slot.playerName,
                                playerPosition: slot.playerPosition,
                                playerTeamName: slot.playerTeamName,
                                playerPhotoUrl: slot.playerPhotoUrl,
                                slotPosition: slot.slotPosition,
                                salaryAtLock: slot.salaryAtLock,
                            })),
                        },
                    },
                    include: { slots: true },
                })
                return this.toRecord(row)
            } catch (createError) {
                // Concurrent snapshot path: another writer beat us to the
                // (memberId, week) unique constraint. Read back the winning
                // row instead of surfacing the conflict.
                if (this.isUniqueViolation(createError)) {
                    const winner = await prisma.weeklyLineup.findUnique({
                        where: {
                            leagueMemberId_week: {
                                leagueMemberId: input.leagueMemberId,
                                week: input.week,
                            },
                        },
                        include: { slots: true },
                    })
                    if (winner) return this.toRecord(winner)
                }
                throw createError
            }
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    private isUniqueViolation(error: unknown): boolean {
        return (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            (error as { code: unknown }).code === 'P2002'
        )
    }

    private toRecord(row: WeeklyLineupRow): WeeklyLineupRecord {
        return {
            id: row.id,
            leagueMemberId: row.leagueMemberId,
            week: row.week,
            captainExternalPlayerId: row.captainExternalPlayerId,
            lockedAt: row.lockedAt,
            slots: row.slots.map((slot) => this.toSlotRecord(slot)),
        }
    }

    private toSlotRecord(row: WeeklyLineupSlotRow): WeeklyLineupSlotRecord {
        return {
            externalPlayerId: row.externalPlayerId,
            playerName: row.playerName,
            playerPosition: String(row.playerPosition),
            playerTeamName: row.playerTeamName,
            playerPhotoUrl: row.playerPhotoUrl,
            slotPosition: String(row.slotPosition),
            salaryAtLock: row.salaryAtLock,
        }
    }
}
