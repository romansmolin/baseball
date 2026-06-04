import { LeagueStatus } from '../../../src/generated/prisma/enums'
import { ApiError } from '../../errors/api.error'
import { ErrorCode } from '../../errors/error-code.enum'
import { prisma } from '../../lib/prisma'
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
    SnapshotAllForCurrentWeekResult,
} from './weekly-lineup-snapshot.service.interface'

// Statuses for which the cron should attempt to snapshot the current week.
// COMPLETED / ARCHIVED never get fresh snapshots — their weeks are settled
// by definition, and seed/migration backfill covers historical rows.
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

            for (const member of members) {
                const existing =
                    await this.weeklyLineupRepository.findByMemberAndWeek(
                        member.id,
                        currentWeek,
                    )
                if (existing) continue

                await this.snapshotMemberForWeek(member.id, currentWeek)
                membersSnapshotted += 1
            }
        }

        return { tournamentsScanned, membersSnapshotted }
    }
}
