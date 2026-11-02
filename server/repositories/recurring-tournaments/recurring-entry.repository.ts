import type { Prisma, PrismaClient } from '../../../src/generated/prisma/client'

export class RecurringEntryRepository {
    constructor(private readonly db: PrismaClient) {}
    async withLockedTournament<T>(leagueId: string, teamId: string, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        return this.db.$transaction(async tx => {
            // All recurring writers use League → metadata → team after any worker lease.
            await tx.$queryRaw`SELECT id FROM "League" WHERE id=${leagueId} FOR UPDATE`
            await tx.$queryRaw`SELECT id FROM "RecurringTournament" WHERE "leagueId"=${leagueId} FOR UPDATE`
            await tx.$queryRaw`SELECT id FROM "FantasyTeam" WHERE id=${teamId} FOR UPDATE`
            return work(tx)
        }, { maxWait: 5000, timeout: 10000 })
    }
}
