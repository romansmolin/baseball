import type { Prisma } from '../../../src/generated/prisma/client'

export async function hasRecurringTournamentTable(db: Pick<Prisma.TransactionClient, '$queryRaw'>): Promise<boolean> {
    const [row] = await db.$queryRaw<{ available: boolean }[]>`SELECT to_regclass('"RecurringTournament"') IS NOT NULL AS available`
    return row.available
}
