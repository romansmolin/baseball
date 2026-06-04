import { prisma } from '../../lib/prisma'
import { handleRepositoryError } from '../../shared/db/prisma-error.utils'

import type { ILeagueRepository, LeagueRecord } from './league.repository.interface'

const LEAGUE_SELECT = {
    id: true,
    name: true,
    leagueSlug: true,
    status: true,
    startsAt: true,
    endsAt: true,
    totalWeeks: true,
    entryFeeCredits: true,
    prizePoolCredits: true,
    visibility: true,
} as const

export class LeagueRepository implements ILeagueRepository {
    async findById(id: string): Promise<LeagueRecord | null> {
        try {
            const league = await prisma.league.findUnique({
                where: { id },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                select: LEAGUE_SELECT as any,
            })

            return league as unknown as LeagueRecord | null
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async findManyByIds(ids: string[]): Promise<LeagueRecord[]> {
        if (ids.length === 0) return []
        try {
            const rows = await prisma.league.findMany({
                where: { id: { in: ids } },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                select: LEAGUE_SELECT as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                orderBy: { endsAt: 'desc' } as any,
            })
            return rows as unknown as LeagueRecord[]
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }
}
