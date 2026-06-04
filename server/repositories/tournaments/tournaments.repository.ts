import { LeagueStatus } from '../../../src/generated/prisma/enums'
import type { Prisma } from '../../../src/generated/prisma/client'
import { prisma } from '../../lib/prisma'
import type {
    LeagueMemberWithTeam,
    TournamentWithMemberCount,
} from '../../models/tournament/tournament.model'
import { handleRepositoryError } from '../../shared/db/prisma-error.utils'

import type {
    ITournamentsRepository,
    TournamentsListFilter,
    TournamentsListResult,
} from './tournaments.repository.interface'

// Status buckets that share a sort order. Completed/playoffs/archived list
// the most recently ended first; drafting/in_season list the soonest-to-start
// first so the catalog feels "next" rather than "past".
const RECENT_FIRST: ReadonlySet<LeagueStatus> = new Set([
    LeagueStatus.COMPLETED,
    LeagueStatus.ARCHIVED,
    LeagueStatus.PLAYOFFS,
])

export class TournamentsRepository implements ITournamentsRepository {
    async list(filter: TournamentsListFilter): Promise<TournamentsListResult> {
        try {
            const where = this.buildWhere(filter)
            const orderBy = this.buildOrderBy(filter.status)

            const [rows, total] = await Promise.all([
                prisma.league.findMany({
                    where,
                    orderBy,
                    skip: filter.offset,
                    take: filter.limit,
                    include: {
                        _count: { select: { members: true } },
                    },
                }),
                prisma.league.count({ where }),
            ])

            return { items: rows, total }
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async findById(id: string): Promise<TournamentWithMemberCount | null> {
        try {
            return await prisma.league.findUnique({
                where: { id },
                include: {
                    _count: { select: { members: true } },
                },
            })
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async findStandingsMembers(leagueId: string): Promise<LeagueMemberWithTeam[]> {
        try {
            // No rosterSlots include — the scoring engine reads frozen lineups
            // from WeeklyLineup directly. We only need id + name for the
            // standings table cells.
            return await prisma.leagueMember.findMany({
                where: { leagueId },
                include: {
                    user: { select: { id: true, name: true } },
                    fantasyTeam: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                // Deterministic baseline order — service applies the real sort
                // by totalPoints after computing scores.
                orderBy: { id: 'asc' },
            })
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    private buildWhere(filter: TournamentsListFilter): Prisma.LeagueWhereInput {
        const where: Prisma.LeagueWhereInput = {}

        if (filter.leagueSlug) {
            where.leagueSlug = filter.leagueSlug
        }
        if (filter.status && filter.status.length > 0) {
            where.status = { in: filter.status }
        }
        if (filter.visibility && filter.visibility.length > 0) {
            where.visibility = { in: filter.visibility }
        }

        return where
    }

    private buildOrderBy(
        status: LeagueStatus[] | undefined,
    ): Prisma.LeagueOrderByWithRelationInput {
        // If the filter is exclusively "recent first" statuses, sort by endsAt
        // desc. Otherwise default to startsAt asc.
        if (status && status.length > 0 && status.every((s) => RECENT_FIRST.has(s))) {
            return { endsAt: 'desc' }
        }
        return { startsAt: 'asc' }
    }
}
