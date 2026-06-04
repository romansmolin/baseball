import type { Prisma } from '../../../src/generated/prisma/client'
import { prisma } from '../../lib/prisma'
import { handleRepositoryError } from '../../shared/db/prisma-error.utils'

import type {
    IWeeklyScoreCacheRepository,
    WeeklyScoreBreakdown,
    WeeklyScoreCacheRecord,
    WeeklyScoreCacheUpsertInput,
} from './weekly-score-cache.repository.interface'

// `points` is stored as Postgres `Decimal(10,2)` — we coerce to a plain
// number at the repository boundary so service/UI layers never touch
// Prisma.Decimal. Breakdown JSON round-trips through the same TypeScript
// shape, so reading it back as that shape is safe.
type WeeklyScoreCacheRow = Awaited<
    ReturnType<typeof prisma.weeklyScoreCache.findFirst>
>

export class WeeklyScoreCacheRepository implements IWeeklyScoreCacheRepository {
    async findByMember(leagueMemberId: string): Promise<WeeklyScoreCacheRecord[]> {
        try {
            const rows = await prisma.weeklyScoreCache.findMany({
                where: { leagueMemberId },
                orderBy: { week: 'asc' },
            })

            return rows.map(this.toRecord)
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async upsert(input: WeeklyScoreCacheUpsertInput): Promise<WeeklyScoreCacheRecord> {
        try {
            const row = await prisma.weeklyScoreCache.upsert({
                where: {
                    leagueMemberId_week: {
                        leagueMemberId: input.leagueMemberId,
                        week: input.week,
                    },
                },
                create: {
                    leagueMemberId: input.leagueMemberId,
                    week: input.week,
                    points: input.points,
                    state: input.state,
                    staleAt: input.staleAt,
                    // Cast: WeeklyScoreBreakdown is structurally JSON-safe
                    // but TS can't statically prove it matches Prisma's
                    // branded InputJsonValue.
                    breakdown: input.breakdown as unknown as Prisma.InputJsonValue,
                    scoringRuleId: input.scoringRuleId,
                },
                update: {
                    points: input.points,
                    state: input.state,
                    staleAt: input.staleAt,
                    // Cast: WeeklyScoreBreakdown is structurally JSON-safe
                    // but TS can't statically prove it matches Prisma's
                    // branded InputJsonValue.
                    breakdown: input.breakdown as unknown as Prisma.InputJsonValue,
                    scoringRuleId: input.scoringRuleId,
                },
            })

            return this.toRecord(row)
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    private toRecord(row: NonNullable<WeeklyScoreCacheRow>): WeeklyScoreCacheRecord {
        return {
            id: row.id,
            leagueMemberId: row.leagueMemberId,
            week: row.week,
            points: Number(row.points),
            state: row.state,
            staleAt: row.staleAt,
            breakdown: row.breakdown as unknown as WeeklyScoreBreakdown,
            scoringRuleId: row.scoringRuleId,
        }
    }
}
