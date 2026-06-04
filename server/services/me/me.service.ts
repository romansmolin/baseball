import { ApiError } from '../../errors/api.error'
import { ErrorCode } from '../../errors/error-code.enum'
import {
    creditsSummary,
    dashboardMetrics,
    onboardingSteps,
    recentActivity,
} from '../../shared/dashboard-stubs'
import { SPORT_LEAGUES } from '../../shared/sport-leagues.const'
import type { FantasyTeamWithRoster } from '../../models/fantasy-team/fantasy-team.model'
import type {
    CreateRosterSlotInput,
    IFantasyTeamRepository,
} from '../../repositories/fantasy-team/fantasy-team.repository.interface'
import type { ILeagueMemberRepository, LeagueMemberRecord } from '../../repositories/league-member/league-member.repository.interface'
import type { ILeagueRepository, LeagueRecord } from '../../repositories/league/league.repository.interface'
import type { IScoringRuleRepository } from '../../repositories/scoring-rule/scoring-rule.repository.interface'
import {
    PlayerPosition,
    RosterSlotPosition,
} from '../../../src/generated/prisma/enums'
import type {
    IWeeklyScoringService,
    ScoringInputLeague,
} from '../scoring/weekly-scoring.service.interface'
import { computeTournamentCurrentWeek } from '../tournaments/tournament-week.util'
import type {
    ActivityEvent,
    CreditsSummary,
    DashboardMetrics,
    OnboardingStep,
} from '@/shared/dashboard'
import {
    ROSTER_SIZE,
    SALARY_CAP_DEFAULT,
} from '@/shared/team-builder'
import type {
    BuilderBudget,
    BuilderRosterSlotPayload,
    CreateTeamPayload,
    CreateTeamResult,
    PoolPosition,
    SlotKey,
    UpdateLineupPayload,
} from '@/shared/team-builder'
import type { MyTeamsPayload, Team } from '@/shared/teams'
import type {
    TournamentRecord,
    TournamentStatus,
    UserTournamentProgress,
    UserTournamentWeeklyScore,
} from '@/shared/tournaments'
import type { IMeService } from './me.service.interface'

const SLOT_KEY_TO_ROSTER_POSITION: Record<SlotKey, RosterSlotPosition> = {
    P: RosterSlotPosition.P,
    C: RosterSlotPosition.C,
    '1B': RosterSlotPosition.FIRST_BASE,
    '2B': RosterSlotPosition.SECOND_BASE,
    '3B': RosterSlotPosition.THIRD_BASE,
    SS: RosterSlotPosition.SS,
    LF: RosterSlotPosition.OF,
    CF: RosterSlotPosition.OF,
    RF: RosterSlotPosition.OF,
}

const POOL_POSITION_TO_PLAYER_POSITION: Record<PoolPosition, PlayerPosition> = {
    P: PlayerPosition.P,
    C: PlayerPosition.C,
    '1B': PlayerPosition.FIRST_BASE,
    '2B': PlayerPosition.SECOND_BASE,
    '3B': PlayerPosition.THIRD_BASE,
    SS: PlayerPosition.SS,
    OF: PlayerPosition.OF,
}

// Reverse of POOL_POSITION_TO_PLAYER_POSITION for normalizing API responses
// back to the shorthand the team-builder UI expects. The DB enum has more
// values (LF/CF/RF/DH/IF/UTIL) — we collapse the outfield variants and the
// utility variants down to the closest PoolPosition.
const PLAYER_POSITION_TO_POOL_POSITION: Partial<
    Record<PlayerPosition, PoolPosition>
> = {
    P: 'P',
    C: 'C',
    FIRST_BASE: '1B',
    SECOND_BASE: '2B',
    THIRD_BASE: '3B',
    SS: 'SS',
    LF: 'OF',
    CF: 'OF',
    RF: 'OF',
    OF: 'OF',
}

// Non-OF slot positions map 1:1 back to a SlotKey. OF slots are ambiguous —
// DB only stores 'OF', but the team builder expects LF/CF/RF. We distribute
// OF rows across LF→CF→RF in iteration order so all three slots fill in.
const NON_OF_ROSTER_TO_SLOT_KEY: Partial<Record<RosterSlotPosition, SlotKey>> = {
    P: 'P',
    C: 'C',
    FIRST_BASE: '1B',
    SECOND_BASE: '2B',
    THIRD_BASE: '3B',
    SS: 'SS',
}

const OF_SLOT_KEYS: SlotKey[] = ['LF', 'CF', 'RF']

const DEFAULT_ACTIVITY_LIMIT = 10
const MS_PER_DAY = 1000 * 60 * 60 * 24

export class MeService implements IMeService {
    private readonly fantasyTeamRepository: IFantasyTeamRepository
    private readonly leagueRepository: ILeagueRepository
    private readonly leagueMemberRepository: ILeagueMemberRepository
    private readonly weeklyScoringService: IWeeklyScoringService
    private readonly scoringRuleRepository: IScoringRuleRepository

    constructor(
        fantasyTeamRepository: IFantasyTeamRepository,
        leagueRepository: ILeagueRepository,
        leagueMemberRepository: ILeagueMemberRepository,
        weeklyScoringService: IWeeklyScoringService,
        scoringRuleRepository: IScoringRuleRepository,
    ) {
        this.fantasyTeamRepository = fantasyTeamRepository
        this.leagueRepository = leagueRepository
        this.leagueMemberRepository = leagueMemberRepository
        this.weeklyScoringService = weeklyScoringService
        this.scoringRuleRepository = scoringRuleRepository
    }

    // The 'account' step is implicitly done — they had to sign in to hit /me.
    // The 'team' step flips to done as soon as the user has at least one
    // FantasyTeam; while team is still 'next' the tournament step stays
    // 'locked'. Cheap to compute (two findMany over indexed userId columns).
    async getOnboarding(userId: string): Promise<OnboardingStep[]> {
        const [teams, memberships] = await Promise.all([
            this.fantasyTeamRepository.findByUserId(userId),
            this.leagueMemberRepository.findByUserId(userId),
        ])

        const hasTeam = teams.length > 0
        const hasTournament = memberships.length > 0

        return onboardingSteps.map((step) => {
            if (step.id === 'team') {
                return { ...step, status: hasTeam ? 'done' : 'next' }
            }
            if (step.id === 'tournament') {
                if (hasTournament) return { ...step, status: 'done' }
                return { ...step, status: hasTeam ? 'next' : 'locked' }
            }
            return step
        })
    }

    async getCredits(_userId: string): Promise<CreditsSummary> {
        return creditsSummary
    }

    async getMetrics(_userId: string): Promise<DashboardMetrics> {
        return dashboardMetrics
    }

    async getActivity(_userId: string, limit?: number): Promise<ActivityEvent[]> {
        const effectiveLimit = limit ?? DEFAULT_ACTIVITY_LIMIT
        return recentActivity.slice(0, effectiveLimit)
    }

    async getMyTeams(userId: string): Promise<MyTeamsPayload> {
        const rows = await this.fantasyTeamRepository.findByUserId(userId)
        return {
            teams: rows.map((row) => this.toWidgetTeam(row)),
            leagues: SPORT_LEAGUES,
        }
    }

    async getBudget(_userId: string): Promise<BuilderBudget> {
        return { salaryCap: SALARY_CAP_DEFAULT }
    }

    async renameMyTeam(userId: string, teamId: string, name: string): Promise<Team> {
        const existing = await this.fantasyTeamRepository.findById(teamId)
        if (!existing) {
            throw new ApiError(404, ErrorCode.TEAM_NOT_FOUND, `Team not found: ${teamId}`)
        }
        if (existing.userId !== userId) {
            throw new ApiError(403, ErrorCode.TEAM_NOT_OWNED, `Team ${teamId} is not owned by this user`)
        }

        const updated = await this.fantasyTeamRepository.updateName(teamId, name)
        return this.toWidgetTeam(updated)
    }

    async createMyTeam(
        userId: string,
        payload: CreateTeamPayload,
    ): Promise<CreateTeamResult> {
        this.validateLineupPayload(payload.players, payload.captainExternalPlayerId)

        const rosterSlots = payload.players.map((player) =>
            this.toRosterSlotInput(player),
        )

        const created = await this.fantasyTeamRepository.create({
            userId,
            name: payload.name,
            leagueSlug: payload.leagueSlug,
            format: payload.format,
            captainExternalPlayerId: payload.captainExternalPlayerId,
            rosterSlots,
        })

        return {
            id: created.id,
            name: created.name,
            leagueSlug: created.leagueSlug,
        }
    }

    async updateMyTeamLineup(
        userId: string,
        teamId: string,
        payload: UpdateLineupPayload,
    ): Promise<Team> {
        const existing = await this.fantasyTeamRepository.findById(teamId)
        if (!existing) {
            throw new ApiError(
                404,
                ErrorCode.TEAM_NOT_FOUND,
                `Team not found: ${teamId}`,
            )
        }
        if (existing.userId !== userId) {
            throw new ApiError(
                403,
                ErrorCode.TEAM_NOT_OWNED,
                `Team ${teamId} is not owned by this user`,
            )
        }

        this.validateLineupPayload(payload.players, payload.captainExternalPlayerId)

        const rosterSlots = payload.players.map((player) =>
            this.toRosterSlotInput(player),
        )

        const updated = await this.fantasyTeamRepository.replaceRoster({
            teamId,
            captainExternalPlayerId: payload.captainExternalPlayerId ?? null,
            rosterSlots,
        })

        return this.toWidgetTeam(updated)
    }

    private validateLineupPayload(
        players: BuilderRosterSlotPayload[],
        captainExternalPlayerId: number | undefined,
    ): void {
        const salaryUsed = players.reduce(
            (sum, player) => sum + player.salaryAtLock,
            0,
        )

        if (salaryUsed > SALARY_CAP_DEFAULT) {
            throw new ApiError(
                400,
                ErrorCode.BUDGET_EXCEEDED,
                `Lineup salary (${salaryUsed}) exceeds salary cap (${SALARY_CAP_DEFAULT})`,
            )
        }

        if (players.length !== ROSTER_SIZE) {
            throw new ApiError(
                400,
                ErrorCode.INCOMPLETE_ROSTER,
                `Roster must contain exactly ${ROSTER_SIZE} players (got ${players.length})`,
            )
        }

        if (captainExternalPlayerId !== undefined) {
            const captainMatches = players.some(
                (player) => player.externalPlayerId === captainExternalPlayerId,
            )
            if (!captainMatches) {
                throw ApiError.validationError(
                    'captainExternalPlayerId must match one of the players in the lineup',
                )
            }
        }
    }

    private toRosterSlotInput(
        player: BuilderRosterSlotPayload,
    ): CreateRosterSlotInput {
        return {
            externalPlayerId: player.externalPlayerId,
            playerName: player.name,
            playerPosition: POOL_POSITION_TO_PLAYER_POSITION[player.position],
            playerTeamName: player.teamName,
            slotPosition: SLOT_KEY_TO_ROSTER_POSITION[player.slotKey],
            salaryAtLock: player.salaryAtLock,
        }
    }

    private toWidgetTeam(row: FantasyTeamWithRoster): Team {
        const savedDaysAgo = Math.max(
            0,
            Math.floor((Date.now() - row.createdAt.getTime()) / MS_PER_DAY),
        )

        const captainId = row.captainExternalPlayerId

        // OF slots in the DB collapse LF/CF/RF down to 'OF', but the team
        // builder edit page expects distinct slot keys. Distribute OF rows
        // across LF→CF→RF in iteration order; non-OF slots map 1:1. Without
        // this, only P/C/SS slots survived the team-builder's isSlotKey
        // filter and edits showed only 3 players.
        let ofCursor = 0
        const rosterSlots = row.rosterSlots.map((slot) => {
            const slotKey =
                slot.slotPosition === 'OF'
                    ? (OF_SLOT_KEYS[ofCursor++] ?? 'OF')
                    : (NON_OF_ROSTER_TO_SLOT_KEY[slot.slotPosition] ??
                      String(slot.slotPosition))
            const playerPos =
                PLAYER_POSITION_TO_POOL_POSITION[slot.playerPosition] ??
                String(slot.playerPosition)

            return {
                id: slot.id,
                externalPlayerId: slot.externalPlayerId,
                playerName: slot.playerName,
                playerPosition: playerPos,
                playerTeamName: slot.playerTeamName,
                playerPhotoUrl: slot.playerPhotoUrl ?? null,
                slotPosition: slotKey,
                salaryAtLock: slot.salaryAtLock,
                isCaptain:
                    captainId !== null && slot.externalPlayerId === captainId,
            }
        })

        return {
            id: row.id,
            leagueMemberId: row.leagueMemberId,
            name: row.name,
            leagueSlug: row.leagueSlug,
            format: this.toTeamFormat(row.format),
            players: row.rosterSlots.length,
            proj: 0,
            best: Number(row.totalScore),
            entered: row.leagueMemberId ? 1 : 0,
            captain: captainId !== null,
            fav: false,
            savedDaysAgo,
            status: row.leagueMemberId ? 'active' : 'draft',
            rosterSlots,
        }
    }

    private toTeamFormat(rawFormat: string | null): Team['format'] {
        if (rawFormat === 'Daily' || rawFormat === 'Weekly' || rawFormat === 'Tournament') {
            return rawFormat
        }
        return 'Weekly'
    }

    async getMyTournaments(userId: string): Promise<TournamentRecord[]> {
        const memberships = await this.leagueMemberRepository.findByUserId(userId)
        if (memberships.length === 0) return []

        const leagueIds = memberships.map((m) => m.leagueId)
        const leagues = await this.leagueRepository.findManyByIds(leagueIds)

        const now = new Date()
        const records: TournamentRecord[] = await Promise.all(
            leagues.map(async (league) => {
                const members = await this.leagueMemberRepository.findAllByLeagueId(
                    league.id,
                )
                return this.toTournamentRecord(league, members.length, now)
            }),
        )

        return records.sort(
            (a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime(),
        )
    }

    async getMyTournamentProgress(
        userId: string,
        tournamentId: string,
    ): Promise<UserTournamentProgress> {
        const league = await this.leagueRepository.findById(tournamentId)
        if (!league) {
            throw ApiError.notFound(
                ErrorCode.TOURNAMENT_NOT_FOUND,
                'Tournament not found',
            )
        }

        const membership = await this.leagueMemberRepository.findByLeagueAndUser(
            league.id,
            userId,
        )
        if (!membership) {
            throw ApiError.notFound(
                ErrorCode.USER_NOT_IN_TOURNAMENT,
                'You have not joined this tournament',
            )
        }

        const now = new Date()
        const currentWeek = computeTournamentCurrentWeek({
            status: league.status,
            startsAt: league.startsAt,
            totalWeeks: league.totalWeeks,
            now,
        })

        const allMembers = await this.leagueMemberRepository.findAllByLeagueId(league.id)
        const team = await this.findFantasyTeamForMember(membership)

        // No weeks scored yet — short-circuit before any provider/cache work.
        if (currentWeek <= 0) {
            const weeklyScores: UserTournamentWeeklyScore[] = []
            for (let week = 1; week <= league.totalWeeks; week += 1) {
                weeklyScores.push({ week, points: 0, awarded: false })
            }
            return {
                tournamentId: league.id,
                tournamentName: league.name,
                leagueSlug: league.leagueSlug,
                status: league.status as TournamentStatus,
                leagueMemberId: membership.id,
                fantasyTeamId: team?.id ?? null,
                fantasyTeamName: team?.name ?? null,
                currentWeek,
                totalWeeks: league.totalWeeks,
                totalPoints: 0,
                rank: allMembers.length,
                memberCount: allMembers.length,
                weeklyScores,
            }
        }

        const rule = await this.scoringRuleRepository.findByLeagueId(league.id)
        if (!rule) {
            throw new ApiError(
                500,
                ErrorCode.SCORING_RULE_NOT_FOUND,
                'Scoring rule not configured for tournament',
            )
        }

        const scoringLeague: ScoringInputLeague = {
            id: league.id,
            startsAt: league.startsAt,
            totalWeeks: league.totalWeeks,
        }

        // Prepare the user's own member weeks first (their breakdown depends
        // on the cache being fresh). The scoring engine reads its lineup
        // snapshots from WeeklyLineup directly — no roster passed in.
        await this.weeklyScoringService.prepareMemberWeeks(
            membership.id,
            scoringLeague,
            rule,
            currentWeek,
        )

        const breakdown = await this.weeklyScoringService.weeklyBreakdown(
            membership.id,
            league.totalWeeks,
        )

        const weeklyScores: UserTournamentWeeklyScore[] = breakdown.map((row) => ({
            week: row.week,
            points: row.points,
            awarded: row.awarded && row.week <= currentWeek,
        }))

        const totalPoints = await this.weeklyScoringService.totalThroughWeek(
            membership.id,
            currentWeek,
        )

        // For rank, score every other member too. The standings endpoint
        // shares the same cache, so this loop typically reads cached rows
        // after the first call.
        const otherMembers = allMembers.filter((m) => m.id !== membership.id)
        await Promise.all(
            otherMembers.map(async (member) => {
                await this.weeklyScoringService.prepareMemberWeeks(
                    member.id,
                    scoringLeague,
                    rule,
                    currentWeek,
                )
            }),
        )

        const totals = await Promise.all(
            allMembers.map(async (member) => ({
                memberId: member.id,
                total: await this.weeklyScoringService.totalThroughWeek(
                    member.id,
                    currentWeek,
                ),
            })),
        )

        totals.sort((a, b) => {
            if (b.total !== a.total) return b.total - a.total
            return a.memberId.localeCompare(b.memberId)
        })

        const rank = totals.findIndex((r) => r.memberId === membership.id) + 1

        return {
            tournamentId: league.id,
            tournamentName: league.name,
            leagueSlug: league.leagueSlug,
            status: league.status as TournamentStatus,
            leagueMemberId: membership.id,
            fantasyTeamId: team?.id ?? null,
            fantasyTeamName: team?.name ?? null,
            currentWeek,
            totalWeeks: league.totalWeeks,
            totalPoints,
            rank: rank > 0 ? rank : allMembers.length,
            memberCount: allMembers.length,
            weeklyScores,
        }
    }

    private async findFantasyTeamForMember(
        membership: LeagueMemberRecord,
    ): Promise<FantasyTeamWithRoster | null> {
        const teams = await this.fantasyTeamRepository.findByUserId(membership.userId)
        return teams.find((t) => t.leagueMemberId === membership.id) ?? null
    }

    private toTournamentRecord(
        league: LeagueRecord,
        memberCount: number,
        now: Date,
    ): TournamentRecord {
        const currentWeek = computeTournamentCurrentWeek({
            status: league.status,
            startsAt: league.startsAt,
            totalWeeks: league.totalWeeks,
            now,
        })

        return {
            id: league.id,
            name: league.name,
            leagueSlug: league.leagueSlug,
            visibility: league.visibility,
            status: league.status as TournamentStatus,
            startsAt: league.startsAt.toISOString(),
            endsAt: league.endsAt.toISOString(),
            totalWeeks: league.totalWeeks,
            currentWeek,
            entryFeeCredits: league.entryFeeCredits,
            prizePoolCredits: league.prizePoolCredits,
            memberCount,
        }
    }
}
