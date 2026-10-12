import { LeagueStatus } from '../../../src/generated/prisma/enums'
import { ApiError } from '../../errors/api.error'
import { ErrorCode } from '../../errors/error-code.enum'
import { prisma } from '../../lib/prisma'
import { mapWithConcurrency } from '../../shared/concurrency.utils'
import type { IFantasyTeamRepository } from '../../repositories/fantasy-team/fantasy-team.repository.interface'
import type { ILeagueRepository } from '../../repositories/league/league.repository.interface'
import type {
    CreateWeeklyLineupSlotInput,
    IWeeklyLineupRepository,
    WeeklyLineupRecord,
} from '../../repositories/weekly-lineup/weekly-lineup.repository.interface'
import { tournamentWeekRange } from '../tournaments/tournament-week-range.util'
import { computeTournamentCurrentWeek } from '../tournaments/tournament-week.util'

import type {
    IWeeklyLineupSnapshotService,
    BackfillMissingWeeksOptions,
    BackfillMissingWeeksResult,
    SnapshotAllForCurrentWeekResult,
} from './weekly-lineup-snapshot.service.interface'

// Statuses for which the cron should attempt to snapshot the current week.
// COMPLETED / ARCHIVED never get fresh snapshots — their weeks are settled
// by definition, and seed/migration backfill covers historical rows.
// Parallel snapshot writes per tournament; the pool is small enough to stay
// under the DB connection limit.
const SNAPSHOT_CONCURRENCY = 8
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

const SNAPSHOT_ELIGIBLE_STATUSES: ReadonlySet<LeagueStatus> = new Set([
    LeagueStatus.DRAFTING,
    LeagueStatus.IN_SEASON,
    LeagueStatus.PLAYOFFS,
])

export class WeeklyLineupSnapshotService implements IWeeklyLineupSnapshotService {
    private readonly weeklyLineupRepository: IWeeklyLineupRepository
    private readonly fantasyTeamRepository: IFantasyTeamRepository
    private readonly leagueRepository: ILeagueRepository

    constructor(
        weeklyLineupRepository: IWeeklyLineupRepository,
        fantasyTeamRepository: IFantasyTeamRepository,
        leagueRepository: ILeagueRepository,
    ) {
        this.weeklyLineupRepository = weeklyLineupRepository
        this.fantasyTeamRepository = fantasyTeamRepository
        this.leagueRepository = leagueRepository
    }

    async snapshotMemberForWeek(
        memberId: string,
        week: number,
    ): Promise<WeeklyLineupRecord> {
        if (week < 1) {
            throw ApiError.validationError(
                `snapshotMemberForWeek: week must be >= 1, received ${week}`,
            )
        }

        const existing = await this.weeklyLineupRepository.findByMemberAndWeek(
            memberId,
            week,
        )
        if (existing) return existing

        const memberRow = await prisma.leagueMember.findUnique({
            where: { id: memberId },
            select: { id: true, leagueId: true },
        })
        if (!memberRow) {
            throw ApiError.notFound(
                ErrorCode.USER_NOT_IN_TOURNAMENT,
                `League member not found: ${memberId}`,
            )
        }

        return this.snapshotMemberForWeekWithLeagueId(
            memberId,
            week,
            memberRow.leagueId,
        )
    }

    async snapshotForJoin(
        memberId: string,
        leagueId: string,
    ): Promise<WeeklyLineupRecord | null> {
        const league = await this.leagueRepository.findById(leagueId)
        if (!league) {
            throw ApiError.notFound(
                ErrorCode.TOURNAMENT_NOT_FOUND,
                `Tournament not found: ${leagueId}`,
            )
        }

        const now = new Date()
        const currentWeek = computeTournamentCurrentWeek({
            status: league.status,
            startsAt: league.startsAt,
            totalWeeks: league.totalWeeks,
            now,
        })

        // The "next un-locked week" is currentWeek + 1 — week N (currentWeek)
        // is already in progress at this point, so its lineup is treated as
        // locked. For DRAFTING (currentWeek = 0) this lands on week 1.
        const targetWeek = currentWeek + 1
        if (targetWeek > league.totalWeeks) {
            // No future weeks remain — caller (the join flow) should have
            // already blocked COMPLETED / ARCHIVED, but if a PLAYOFFS league
            // is on its last week we just skip the snapshot.
            return null
        }

        const existing = await this.weeklyLineupRepository.findByMemberAndWeek(
            memberId,
            targetWeek,
        )
        if (existing) return existing

        return this.snapshotMemberForWeekWithLeague(memberId, targetWeek, league)
    }

    private async snapshotMemberForWeekWithLeagueId(
        memberId: string,
        week: number,
        leagueId: string,
    ): Promise<WeeklyLineupRecord> {
        const league = await this.leagueRepository.findById(leagueId)
        if (!league) {
            throw ApiError.notFound(
                ErrorCode.TOURNAMENT_NOT_FOUND,
                `Tournament not found: ${leagueId}`,
            )
        }
        return this.snapshotMemberForWeekWithLeague(memberId, week, league)
    }

    private async snapshotMemberForWeekWithLeague(
        memberId: string,
        week: number,
        league: { startsAt: Date },
    ): Promise<WeeklyLineupRecord> {
        const team =
            await this.fantasyTeamRepository.findByLeagueMemberId(memberId)

        // Members without a linked team get an empty snapshot — scoring for
        // that week resolves to 0 deterministically and the row still anchors
        // the late-joiner timeline.
        const slots: CreateWeeklyLineupSlotInput[] = team
            ? team.rosterSlots.map((slot) => ({
                  externalPlayerId: slot.externalPlayerId,
                  playerName: slot.playerName,
                  playerPosition: slot.playerPosition,
                  playerTeamName: slot.playerTeamName,
                  playerPhotoUrl: slot.playerPhotoUrl,
                  slotPosition: slot.slotPosition,
                  salaryAtLock: slot.salaryAtLock,
              }))
            : []

        const lockedAt = tournamentWeekRange(league.startsAt, week).startUtc

        return this.weeklyLineupRepository.createIfMissing({
            leagueMemberId: memberId,
            week,
            captainExternalPlayerId: team?.captainExternalPlayerId ?? null,
            lockedAt,
            slots,
        })
    }

    async snapshotAllForCurrentWeek(): Promise<SnapshotAllForCurrentWeekResult> {
        const tournaments = await prisma.league.findMany({
            where: {
                status: {
                    in: Array.from(SNAPSHOT_ELIGIBLE_STATUSES) as LeagueStatus[],
                },
            },
            select: {
                id: true,
                status: true,
                startsAt: true,
                totalWeeks: true,
            },
        })

        const now = new Date()
        let tournamentsScanned = 0
        let membersSnapshotted = 0

        for (const tournament of tournaments) {
            tournamentsScanned += 1

            const currentWeek = computeTournamentCurrentWeek({
                status: tournament.status,
                startsAt: tournament.startsAt,
                totalWeeks: tournament.totalWeeks,
                now,
            })
            // Nothing to snapshot for DRAFTING tournaments (week 0). Their
            // snapshots get created at join time and at the boundary into
            // week 1.
            if (currentWeek < 1) continue

            const members = await prisma.leagueMember.findMany({
                where: { leagueId: tournament.id },
                select: { id: true },
            })

            // One query for the whole tournament instead of a lookup per
            // member — that N+1 alone used up the cron's 60s budget.
            const existing = await prisma.weeklyLineup.findMany({
                where: {
                    week: currentWeek,
                    leagueMemberId: { in: members.map((m) => m.id) },
                },
                select: { leagueMemberId: true },
            })
            const hasLineup = new Set(existing.map((row) => row.leagueMemberId))
            const missing = members.filter((m) => !hasLineup.has(m.id))

            await mapWithConcurrency(missing, SNAPSHOT_CONCURRENCY, (member) =>
                this.snapshotMemberForWeekWithLeague(member.id, currentWeek, tournament),
            )
            membersSnapshotted += missing.length
        }

        return { tournamentsScanned, membersSnapshotted }
    }

    async backfillMissingWeeks(
        options: BackfillMissingWeeksOptions,
    ): Promise<BackfillMissingWeeksResult> {
        const deadline = Date.now() + options.budgetMs
        const result: BackfillMissingWeeksResult = {
            applied: options.apply,
            timedOut: false,
            missingLineups: 0,
            created: 0,
            failed: 0,
            cacheRowsInvalidated: 0,
            tournaments: [],
        }

        const tournaments = await prisma.league.findMany({
            where: { status: { in: [LeagueStatus.IN_SEASON, LeagueStatus.PLAYOFFS] } },
            select: { id: true, name: true, status: true, startsAt: true, totalWeeks: true },
            orderBy: { id: 'asc' },
        })

        for (const tournament of tournaments) {
            const currentWeek = computeTournamentCurrentWeek({
                status: tournament.status,
                startsAt: tournament.startsAt,
                totalWeeks: tournament.totalWeeks,
                now: new Date(),
            })
            if (currentWeek < 1) continue

            const members = await prisma.leagueMember.findMany({
                where: { leagueId: tournament.id },
                select: { id: true, createdAt: true },
            })
            const existing = await prisma.weeklyLineup.findMany({
                where: {
                    leagueMemberId: { in: members.map((m) => m.id) },
                    week: { lte: currentWeek },
                },
                select: { leagueMemberId: true, week: true },
            })
            const have = new Set(existing.map((row) => `${row.leagueMemberId}:${row.week}`))

            const work: Array<{ memberId: string; week: number }> = []
            for (const member of members) {
                // A member who joined during week N only owns weeks > N (the join
                // snapshot targets the next un-locked week).
                const firstWeek = options.ignoreJoinDate
                    ? 1
                    : firstOwnedWeek(tournament.startsAt, member.createdAt)
                for (let week = firstWeek; week <= currentWeek; week += 1) {
                    if (!have.has(`${member.id}:${week}`)) {
                        work.push({ memberId: member.id, week })
                    }
                }
            }

            result.missingLineups += work.length
            result.tournaments.push({
                name: tournament.name,
                members: members.length,
                missingLineups: work.length,
            })
            if (!options.apply || work.length === 0) continue

            await mapWithConcurrency(work, SNAPSHOT_CONCURRENCY, async ({ memberId, week }) => {
                if (Date.now() > deadline) {
                    result.timedOut = true
                    return
                }
                try {
                    await this.snapshotMemberForWeekWithLeague(memberId, week, tournament)
                    result.created += 1
                    // The week was cached as a settled "not joined yet" 0 — drop
                    // it so scoring recomputes from the new lineup.
                    const dropped = await prisma.weeklyScoreCache.deleteMany({
                        where: {
                            leagueMemberId: memberId,
                            week,
                            breakdown: { path: ['notJoinedYet'], equals: true },
                        },
                    })
                    result.cacheRowsInvalidated += dropped.count
                } catch (error) {
                    result.failed += 1
                    console.error('[backfillMissingWeeks]', memberId, week, error)
                }
            })
            if (result.timedOut) break
        }

        return result
    }
}

// First week a member's lineup should exist for: week of joining + 1, or 1 when
// they joined before the tournament started.
function firstOwnedWeek(startsAt: Date, joinedAt: Date): number {
    const elapsed = joinedAt.getTime() - startsAt.getTime()
    if (elapsed < 0) return 1
    return Math.floor(elapsed / MS_PER_WEEK) + 2
}
