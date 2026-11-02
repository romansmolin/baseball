import type { PrismaClient } from '../../../src/generated/prisma/client'
import type { ProviderBoxScore } from '../../providers/dto/provider-schedule.dto'
import type { MutationPermit } from '../../services/recurring-tournaments/recurring.types'

export interface SaveGameSnapshot {
    gamePk: number
    leagueSlug: string
    status: string
    boxScore: ProviderBoxScore | null
    complete: boolean
    observedAt: Date
}

export class GameSnapshotsRepository {
    constructor(private readonly db: PrismaClient) {}

    async findMany(gamePks: number[]) {
        return this.db.dailyGameSnapshot.findMany({ where: { gamePk: { in: gamePks } } })
    }

    async save(snapshot: SaveGameSnapshot, permit: MutationPermit): Promise<void> {
        await this.db.$transaction(async tx => {
            await permit.assertInTransaction(tx)
            await tx.$executeRaw`
                INSERT INTO "DailyGameSnapshot" ("gamePk", "leagueSlug", status, "boxScore", complete, "observedAt")
                VALUES (${snapshot.gamePk}, ${snapshot.leagueSlug}, ${snapshot.status}, ${JSON.stringify(snapshot.boxScore)}::jsonb, ${snapshot.complete}, ${snapshot.observedAt})
                ON CONFLICT ("gamePk") DO UPDATE SET
                  "leagueSlug" = EXCLUDED."leagueSlug", status = EXCLUDED.status,
                  "boxScore" = COALESCE(NULLIF(EXCLUDED."boxScore", 'null'::jsonb), "DailyGameSnapshot"."boxScore"),
                  complete = EXCLUDED.complete, "observedAt" = EXCLUDED."observedAt"
                WHERE "DailyGameSnapshot"."observedAt" <= EXCLUDED."observedAt"
                  AND (NOT "DailyGameSnapshot".complete OR EXCLUDED.complete OR (
                    "DailyGameSnapshot".status = 'FINAL' AND CASE
                      WHEN jsonb_typeof("DailyGameSnapshot"."boxScore"->'batters') = 'array'
                       AND jsonb_typeof("DailyGameSnapshot"."boxScore"->'pitchers') = 'array'
                      THEN jsonb_array_length("DailyGameSnapshot"."boxScore"->'batters') = 0
                        OR jsonb_array_length("DailyGameSnapshot"."boxScore"->'pitchers') = 0
                      ELSE TRUE
                    END
                  ))
            `
        })
    }
}
