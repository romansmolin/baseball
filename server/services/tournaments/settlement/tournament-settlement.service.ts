import { CreditTransactionType } from '../../../../src/generated/prisma/enums'
import type { ICreditRepository } from '../../../repositories/credit/credit.repository.interface'
import type { ILeagueRepository } from '../../../repositories/league/league.repository.interface'
import type { ITournamentsRepository } from '../../../repositories/tournaments/tournaments.repository.interface'
import type {
    IWeeklyScoreCacheRepository,
    WeeklyScoreCacheRecord,
} from '../../../repositories/weekly-score-cache/weekly-score-cache.repository.interface'
import { computeTournamentCurrentWeek } from '../tournament-week.util'

import { WEEKLY_PAYOUT_SPLITS, WEEK_PAYOUT_REFERENCE_TYPE } from './settlement.const'
import type {
    ITournamentSettlementService,
    SettlementResult,
} from './tournament-settlement.service.interface'

export class TournamentSettlementService implements ITournamentSettlementService {
    private readonly leagueRepository: ILeagueRepository
    private readonly tournamentsRepository: ITournamentsRepository
    private readonly weeklyScoreCacheRepository: IWeeklyScoreCacheRepository
    private readonly creditRepository: ICreditRepository

    constructor(
        leagueRepository: ILeagueRepository,
        tournamentsRepository: ITournamentsRepository,
        weeklyScoreCacheRepository: IWeeklyScoreCacheRepository,
        creditRepository: ICreditRepository,
    ) {
        this.leagueRepository = leagueRepository
        this.tournamentsRepository = tournamentsRepository
        this.weeklyScoreCacheRepository = weeklyScoreCacheRepository
        this.creditRepository = creditRepository
    }

    async settleTournament(leagueId: string): Promise<SettlementResult> {
        const result: SettlementResult = {
            tournamentId: leagueId,
            weeksSettled: 0,
            payouts: 0,
            creditsPaid: 0,
        }

        const league = await this.leagueRepository.findById(leagueId)
        if (!league || league.prizePoolCredits <= 0 || league.totalWeeks <= 0) {
            return result
        }

        const currentWeek = computeTournamentCurrentWeek({
            status: league.status,
            startsAt: league.startsAt,
            totalWeeks: league.totalWeeks,
        })
        const throughWeek = Math.min(currentWeek, league.totalWeeks)
        if (throughWeek < 1) return result

        const members = await this.tournamentsRepository.findStandingsMembers(leagueId)
        if (members.length === 0) return result

        const userIdByMember = new Map(members.map((m) => [m.id, m.user.id]))
        const cacheRows = await this.weeklyScoreCacheRepository.findByMembers(
            members.map((m) => m.id),
        )
        const rowsByWeek = new Map<number, WeeklyScoreCacheRecord[]>()
        for (const row of cacheRows) {
            const bucket = rowsByWeek.get(row.week)
            if (bucket) bucket.push(row)
            else rowsByWeek.set(row.week, [row])
        }

        const basePot = Math.floor(league.prizePoolCredits / league.totalWeeks)

        for (let week = 1; week <= throughWeek; week += 1) {
            const referenceIdPrefix = `${leagueId}:w${week}:`
            const alreadySettled = await this.creditRepository.existsByReference(
                WEEK_PAYOUT_REFERENCE_TYPE,
                referenceIdPrefix,
            )
            if (alreadySettled) continue

            const rows = rowsByWeek.get(week) ?? []
            // Only settle once the week is fully scored for everyone.
            if (rows.length < members.length) continue
            if (rows.some((r) => r.state !== 'FINAL')) continue

            const ranked = [...rows].sort(
                (a, b) =>
                    b.points - a.points ||
                    a.leagueMemberId.localeCompare(b.leagueMemberId),
            )

            // Final week absorbs the integer-division remainder.
            const pot =
                week === league.totalWeeks
                    ? league.prizePoolCredits - basePot * (league.totalWeeks - 1)
                    : basePot

            const winnerCount = Math.min(WEEKLY_PAYOUT_SPLITS.length, ranked.length)
            const splits = WEEKLY_PAYOUT_SPLITS.slice(0, winnerCount)
            const splitSum = splits.reduce((sum, s) => sum + s, 0)
            const shares = splits.map((s) => Math.floor((pot * s) / splitSum))
            shares[0] += pot - shares.reduce((sum, s) => sum + s, 0)

            for (let i = 0; i < winnerCount; i += 1) {
                const amount = shares[i]
                if (amount <= 0) continue
                const memberId = ranked[i].leagueMemberId
                const userId = userIdByMember.get(memberId)
                if (!userId) continue

                await this.creditRepository.grantCredits({
                    userId,
                    amount,
                    type: CreditTransactionType.TOURNAMENT_WINNINGS,
                    referenceType: WEEK_PAYOUT_REFERENCE_TYPE,
                    referenceId: `${leagueId}:w${week}:${memberId}`,
                })
                result.payouts += 1
                result.creditsPaid += amount
            }
            result.weeksSettled += 1
        }

        return result
    }
}
