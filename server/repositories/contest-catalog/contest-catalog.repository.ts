import { prisma } from '../../lib/prisma'
import type { Prisma, PrismaClient } from '../../../src/generated/prisma/client'
import type { ContestCatalogItem, ContestCatalogKind, ContestCatalogPage, ContestCatalogView } from '@/shared/tournaments'
import type { DailyGame } from '@/shared/daily-contests'
import { hasRecurringTournamentTable } from '../recurring-tournaments/recurring-schema'
import { showcaseEnabled } from '../../shared/showcase-config'

const CURRENT_LEAGUE_STATUSES = ['DRAFTING', 'IN_SEASON', 'PLAYOFFS'] as const
const HISTORY_LEAGUE_STATUSES = ['COMPLETED', 'ARCHIVED', 'CANCELLED'] as const
const MAX_PAGE_WINDOW = 5000

export interface ContestCatalogFilter {
    view: ContestCatalogView
    kind?: ContestCatalogKind
    search?: string
    limit: number
    offset: number
}

function compareItems(a: ContestCatalogItem, b: ContestCatalogItem, view: ContestCatalogView): number {
    const aAt = Date.parse(view === 'history' ? a.endsAt : a.startsAt)
    const bAt = Date.parse(view === 'history' ? b.endsAt : b.startsAt)
    return (view === 'history' ? bAt - aAt : aAt - bAt)
        || a.kind.localeCompare(b.kind)
        || a.id.localeCompare(b.id)
}

function dateStart(date: string): string {
    return new Date(`${date}T12:00:00.000Z`).toISOString()
}

export class ContestCatalogRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async list(filter: ContestCatalogFilter): Promise<ContestCatalogPage> {
        if (!Number.isInteger(filter.limit) || filter.limit < 1 || filter.limit > 100
            || !Number.isInteger(filter.offset) || filter.offset < 0 || filter.offset > MAX_PAGE_WINDOW) {
            throw new Error('Invalid contest catalog page')
        }
        const lookAhead = filter.offset + filter.limit
        const now = new Date()
        const search = filter.search?.trim().slice(0, 100)
        const nameFilter = search ? { contains: search, mode: 'insensitive' as const } : undefined
        const includeDaily = (!filter.kind || filter.kind === 'DAILY') && showcaseEnabled()
        const includeLeague = !filter.kind || filter.kind === 'LEAGUE' || filter.kind === 'SERIES'
        const items: ContestCatalogItem[] = []
        let dailyTotal = 0
        let leagueTotal = 0

        if (includeDaily) {
            const dailyWhere = filter.view === 'history'
                ? { status: { in: ['COMPLETED', 'CANCELLED'] as ('COMPLETED' | 'CANCELLED')[] }, ...(nameFilter ? { name: nameFilter } : {}) }
                : {
                    mode: 'LIVE' as const,
                    status: { in: ['OPEN', 'LOCKED'] as ('OPEN' | 'LOCKED')[] },
                    ...(nameFilter ? { name: nameFilter } : {}),
                }
            const [dailyRows, count] = await this.db.$transaction([
                this.db.dailyContest.findMany({
                    where: dailyWhere,
                    orderBy: filter.view === 'history'
                        ? [{ locksAt: 'desc' }, { id: 'asc' }]
                        : [{ locksAt: 'asc' }, { id: 'asc' }],
                    take: lookAhead,
                    include: { _count: { select: { entries: true } } },
                }),
                this.db.dailyContest.count({ where: dailyWhere }),
            ])
            dailyTotal = count
            for (const row of dailyRows) {
                const day = dateStart(row.contestDate)
                const sourceLeagues = [...new Set((row.games as unknown as DailyGame[]).flatMap(game => game.sourceLeagueSlug ? [game.sourceLeagueSlug] : []))]
                items.push({
                    id: row.id,
                    kind: 'DAILY',
                    name: row.name,
                    leagueSlug: row.leagueSlug,
                    status: row.status === 'OPEN' && row.locksAt <= now ? 'LOCKED' : row.status,
                    startsAt: filter.view === 'history' ? day : row.locksAt.toISOString(),
                    endsAt: row.locksAt.toISOString(),
                    locksAt: row.locksAt.toISOString(),
                    memberCount: row._count.entries,
                    entryFeeCredits: 0,
                    prizePoolCredits: 0,
                    slateKey: row.slateKey,
                    ...(sourceLeagues.length ? { sourceLeagues } : {}),
                })
            }
        }

        if (includeLeague) {
            const statuses = filter.view === 'history' ? HISTORY_LEAGUE_STATUSES : CURRENT_LEAGUE_STATUSES
            const baseWhere: Prisma.LeagueWhereInput = {
                visibility: 'PUBLIC' as const,
                status: { in: [...statuses] },
                ...(nameFilter ? { name: nameFilter } : {}),
            }
            const recurringAvailable = await hasRecurringTournamentTable(this.db)
            const where: Prisma.LeagueWhereInput = {
                ...baseWhere,
                ...(filter.kind === 'SERIES'
                    ? recurringAvailable ? { recurringTournament: { isNot: null } } : { id: '__no_recurring_table__' }
                    : filter.kind === 'LEAGUE' && recurringAvailable ? { recurringTournament: { is: null } } : {}),
            }
            const [leagueRows, count] = await this.db.$transaction([
                this.db.league.findMany({
                    where,
                    orderBy: filter.view === 'history'
                        ? [{ endsAt: 'desc' }, { id: 'asc' }]
                        : [{ startsAt: 'asc' }, { id: 'asc' }],
                    take: lookAhead,
                    include: {
                        _count: { select: { members: true } },
                        ...(recurringAvailable ? { recurringTournament: { select: { templateKey: true, startsAt: true, games: true } } } : {}),
                    },
                }),
                this.db.league.count({ where }),
            ])
            const filteredRows = leagueRows
            leagueTotal = count

            for (const row of filteredRows) {
                const recurring = 'recurringTournament' in row ? row.recurringTournament : null
                const kind = recurring ? 'SERIES' : 'LEAGUE'
                if (filter.kind && kind !== filter.kind) continue
                const sourceLeagues = recurring
                    ? [...new Set((recurring.games as unknown as DailyGame[]).flatMap(game => game.sourceLeagueSlug ? [game.sourceLeagueSlug] : []))]
                    : []
                items.push({
                    id: row.id,
                    kind,
                    name: row.name,
                    leagueSlug: row.leagueSlug,
                    status: row.status,
                    startsAt: row.startsAt.toISOString(),
                    endsAt: row.endsAt.toISOString(),
                    locksAt: recurring ? row.startsAt.toISOString() : null,
                    memberCount: row._count.members,
                    entryFeeCredits: row.entryFeeCredits,
                    prizePoolCredits: row.prizePoolCredits,
                    ...(recurring ? { templateKey: recurring.templateKey } : {}),
                    ...(sourceLeagues.length ? { sourceLeagues } : {}),
                })
            }
        }

        items.sort((a, b) => compareItems(a, b, filter.view))
        return {
            items: items.slice(filter.offset, filter.offset + filter.limit),
            total: dailyTotal + leagueTotal,
            limit: filter.limit,
            offset: filter.offset,
        }
    }
}
