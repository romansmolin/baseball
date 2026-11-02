import type { PrismaClient } from '../../../src/generated/prisma/client'
import { prisma } from '../../lib/prisma'
import { handleRepositoryError } from '../../shared/db/prisma-error.utils'
import { hasRecurringTournamentTable } from '../recurring-tournaments/recurring-schema'

import type { ILeagueRepository, LeagueRecord } from './league.repository.interface'

const LEAGUE_SELECT = {
    id: true,
    name: true,
    leagueSlug: true,
    externalSeasonId: true,
    status: true,
    startsAt: true,
    endsAt: true,
    totalWeeks: true,
    entryFeeCredits: true,
    prizePoolCredits: true,
    visibility: true,
} as const

export class LeagueRepository implements ILeagueRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async findById(id: string): Promise<LeagueRecord | null> {
        try {
            const recurringAvailable = await hasRecurringTournamentTable(this.db)
            const league = await this.db.league.findUnique({
                where: { id },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                select: { ...LEAGUE_SELECT, ...(recurringAvailable ? { recurringTournament: { select: { leagueId: true } } } : {}) } as any,
            })

            return league as unknown as LeagueRecord | null
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async findManyByIds(ids: string[]): Promise<LeagueRecord[]> {
        if (ids.length === 0) return []
        try {
            const recurringAvailable = await hasRecurringTournamentTable(this.db)
            const rows = await this.db.league.findMany({
                where: { id: { in: ids } },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                select: { ...LEAGUE_SELECT, ...(recurringAvailable ? { recurringTournament: { select: { leagueId: true } } } : {}) } as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                orderBy: { endsAt: 'desc' } as any,
            })
            return rows as unknown as LeagueRecord[]
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }
}
