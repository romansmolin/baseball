import { randomUUID } from 'node:crypto'
import type { League, PrismaClient, RecurringTournament } from '../../../src/generated/prisma/client'
import { RECURRING_SERIES_LABELS } from '@/shared/tournaments/recurring'
import type { RecurringTemplateKey } from '@/shared/tournaments/recurring'
import type { MutationPermit, RecurringGame, RecurringSourceSnapshot, RecurringTournamentContext, RecurringWindow } from '../../services/recurring-tournaments/recurring.types'

export interface PublishRecurringInput {
    window: RecurringWindow
    snapshot: RecurringSourceSnapshot
    demoTarget: number
    scoringRuleId: string
    commissionerId: string
    mode: 'FUTURE' | 'HISTORICAL'
}

function toContext(row: RecurringTournament & { league: League }): RecurringTournamentContext {
    if (!(row.templateKey in RECURRING_SERIES_LABELS) || !['north-america', 'winter-leagues'].includes(row.sourceSlug)) throw new Error('Unsupported recurring tournament configuration')
    const totalWeeks = row.league.totalWeeks
    if (totalWeeks !== 1 && totalWeeks !== 2 && totalWeeks !== 4) throw new Error('Unsupported recurring tournament duration')
    return {
        leagueId: row.leagueId,
        publishedAt: row.league.createdAt,
        window: { templateKey: row.templateKey as RecurringTemplateKey, sourceSlug: row.sourceSlug as RecurringTournamentContext['window']['sourceSlug'], startsAt: row.startsAt, endsAt: row.league.endsAt, totalWeeks, configurationVersion: 1 },
        snapshot: { games: row.games as unknown as RecurringGame[], playerPool: row.playerPool as unknown as RecurringSourceSnapshot['playerPool'], checkedAt: row.sourceCheckedAt.toISOString() },
        demoTarget: row.demoTarget,
        outcome: row.outcome,
    }
}

export class RecurringRepository {
    constructor(private readonly db: PrismaClient) {}

    async findByLeagueId(leagueId: string): Promise<RecurringTournamentContext | null> {
        const row = await this.db.recurringTournament.findUnique({ where: { leagueId }, include: { league: true } })
        return row ? toContext(row) : null
    }

    async createIfMissing(input: PublishRecurringInput, permit: MutationPermit): Promise<{ context: RecurringTournamentContext; created: boolean }> {
        const { window, snapshot } = input
        const key = { templateKey: window.templateKey, sourceSlug: window.sourceSlug, startsAt: window.startsAt }
        try {
            return await this.db.$transaction(async tx => {
                await permit.assertInTransaction(tx)
                const existing = await tx.recurringTournament.findUnique({ where: { templateKey_sourceSlug_startsAt: key }, include: { league: true } })
                if (existing) return { context: toContext(existing), created: false }
                const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`
                if (input.mode === 'FUTURE' && window.startsAt <= clock.now) throw new Error('Registration closed')
                const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(window.startsAt)
                const league = await tx.league.create({ data: {
                    commissionerId: input.commissionerId, scoringRuleId: input.scoringRuleId,
                    inviteCode: `recurring-${randomUUID()}`, externalSeasonId: snapshot.games[0]?.apiSeason ?? window.startsAt.getUTCFullYear(),
                    status: window.startsAt > clock.now ? 'DRAFTING' : 'IN_SEASON', draftType: 'AUTO', visibility: 'PUBLIC',
                    name: `${RECURRING_SERIES_LABELS[window.templateKey]} · ${window.sourceSlug === 'north-america' ? 'North American Leagues' : 'Winter Leagues'} · ${date}`,
                    leagueSlug: window.sourceSlug, startsAt: window.startsAt, endsAt: window.endsAt, totalWeeks: window.totalWeeks,
                    entryFeeCredits: 0, prizePoolCredits: 0,
                } })
                const row = await tx.recurringTournament.create({ data: {
                    ...key, leagueId: league.id, configurationVersion: window.configurationVersion,
                    games: JSON.parse(JSON.stringify(snapshot.games)), playerPool: JSON.parse(JSON.stringify(snapshot.playerPool)),
                    demoTarget: input.demoTarget, sourceCheckedAt: new Date(snapshot.checkedAt),
                }, include: { league: true } })
                return { context: toContext(row), created: true }
            })
        } catch (error) {
            if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
                const row = await this.db.recurringTournament.findUnique({ where: { templateKey_sourceSlug_startsAt: key }, include: { league: true } })
                if (row) return { context: toContext(row), created: false }
            }
            throw error
        }
    }
}
