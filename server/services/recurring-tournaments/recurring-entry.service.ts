import { randomUUID } from 'node:crypto'
import type { Prisma, PrismaClient } from '../../../src/generated/prisma/client'
import type { PlayerPosition, RosterSlotPosition } from '../../../src/generated/prisma/enums'
import type { DailyPlayer } from '@/shared/daily-contests'
import type { PoolPosition, SlotKey } from '@/shared/team-builder'
import { FIELD_SLOTS, slotAcceptsPoolPosition } from '@/shared/team-builder'
import type { JoinTournamentResult } from '@/shared/tournaments'
import { ApiError } from '../../errors/api.error'
import { ErrorCode } from '../../errors/error-code.enum'
import { RecurringEntryRepository } from '../../repositories/recurring-tournaments/recurring-entry.repository'
import { validateDailyLineup } from '../daily-contests/daily-rules'
import type { RecurringLineupInput } from './recurring.types'

const slotPositions: Record<SlotKey, RosterSlotPosition> = { P: 'P', C: 'C', '1B': 'FIRST_BASE', '2B': 'SECOND_BASE', '3B': 'THIRD_BASE', SS: 'SS', LF: 'OF', CF: 'OF', RF: 'OF' }
const playerPositions: Record<PoolPosition, PlayerPosition> = { P: 'P', C: 'C', '1B': 'FIRST_BASE', '2B': 'SECOND_BASE', '3B': 'THIRD_BASE', SS: 'SS', OF: 'OF' }
const reverseSlots: Partial<Record<RosterSlotPosition, SlotKey>> = { P: 'P', C: 'C', FIRST_BASE: '1B', SECOND_BASE: '2B', THIRD_BASE: '3B', SS: 'SS' }

export function canonicalRecurringSlots(input: RecurringLineupInput, pool: DailyPlayer[]) {
    return validateDailyLineup({ teamName: 'Lineup', ...input }, pool, 80000).map(({ slotKey, player }) => ({
        externalPlayerId: player.externalPlayerId, playerName: player.name,
        playerPosition: playerPositions[player.position], playerTeamName: player.teamName,
        playerPhotoUrl: player.photoUrl, slotPosition: slotPositions[slotKey], salaryAtLock: player.salary,
    }))
}

function cheapestValidPoolLineup(pool: DailyPlayer[]): RecurringLineupInput {
    const used = new Set<number>()
    const players = FIELD_SLOTS.map(slot => {
        const player = pool
            .filter(candidate => !used.has(candidate.externalPlayerId) && slotAcceptsPoolPosition(slot.key, candidate.position))
            .sort((a, b) => a.salary - b.salary || a.externalPlayerId - b.externalPlayerId)[0]
        if (!player) throw ApiError.conflict(ErrorCode.TOURNAMENT_NOT_JOINABLE, 'Contest player pool cannot form a valid lineup')
        used.add(player.externalPlayerId)
        return { slotKey: slot.key, externalPlayerId: player.externalPlayerId }
    })
    return { players, captainExternalPlayerId: null }
}

async function replaceTeamRoster(tx: Prisma.TransactionClient, teamId: string, slots: ReturnType<typeof canonicalRecurringSlots>, captain: number | null) {
    await tx.rosterSlot.deleteMany({ where: { fantasyTeamId: teamId } })
    await tx.rosterSlot.createMany({ data: slots.map(s => ({ ...s, fantasyTeamId: teamId })) })
    await tx.fantasyTeam.update({ where: { id: teamId }, data: { captainExternalPlayerId: captain } })
}

export async function createRecurringWeeklyDrafts(tx: Prisma.TransactionClient, input: { memberId: string; startsAt: Date; totalWeeks: number; slots: ReturnType<typeof canonicalRecurringSlots>; captain: number | null }) {
    for (let week = 1; week <= input.totalWeeks; week++) {
        await tx.weeklyLineup.create({ data: { leagueMemberId: input.memberId, week, lockedAt: new Date(input.startsAt.getTime() + (week - 1) * 7 * 86400000), captainExternalPlayerId: input.captain, slots: { create: input.slots } } })
    }
}

export async function joinRecurringTournament(db: PrismaClient, input: { userId: string; leagueId: string; teamId: string }): Promise<JoinTournamentResult> {
    return new RecurringEntryRepository(db).withLockedTournament(input.leagueId, input.teamId, async tx => {
        const league = await tx.league.findUnique({ where: { id: input.leagueId }, include: { recurringTournament: true } })
        if (!league?.recurringTournament) throw ApiError.notFound(ErrorCode.TOURNAMENT_NOT_FOUND, 'Recurring tournament not found')
        if (['COMPLETED', 'ARCHIVED', 'CANCELLED'].includes(league.status)) throw ApiError.conflict(ErrorCode.TOURNAMENT_NOT_JOINABLE, 'Registration closed')
        const team = await tx.fantasyTeam.findUnique({ where: { id: input.teamId }, include: { rosterSlots: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } } })
        if (!team) throw ApiError.notFound(ErrorCode.TEAM_NOT_FOUND, 'Team not found')
        if (team.userId !== input.userId) throw new ApiError(403, ErrorCode.TEAM_NOT_OWNED, 'Team is not owned by the viewer')
        const mixedSource = league.recurringTournament.sourceSlug === 'north-america'
        if (!mixedSource && team.leagueSlug !== league.leagueSlug) throw ApiError.conflict(ErrorCode.LEAGUE_MISMATCH, 'Team league does not match the tournament')
        if (await tx.leagueMember.findUnique({ where: { leagueId_userId: { leagueId: league.id, userId: input.userId } } })) throw ApiError.conflict(ErrorCode.USER_ALREADY_JOINED, 'Already joined this tournament')
        if (team.leagueMemberId) throw ApiError.conflict(ErrorCode.TEAM_ALREADY_IN_LEAGUE, 'Team is already entered')
        const pool = league.recurringTournament.playerPool as unknown as DailyPlayer[]
        const outfield: SlotKey[] = ['LF', 'CF', 'RF']
        const players = team.rosterSlots.map(slot => {
            const slotKey = slot.slotPosition === 'OF' ? outfield.shift() : reverseSlots[slot.slotPosition]
            if (!slotKey) throw ApiError.validationError('Invalid lineup position')
            return { slotKey, externalPlayerId: slot.externalPlayerId }
        })
        const captain = team.captainExternalPlayerId
        const initialLineup = mixedSource ? cheapestValidPoolLineup(pool) : { players, captainExternalPlayerId: captain }
        const slots = canonicalRecurringSlots(initialLineup, pool)
        const memberId = randomUUID()
        const inserted = await tx.$queryRaw<{ id: string }[]>`INSERT INTO "LeagueMember" (id,"leagueId","userId","updatedAt") SELECT ${memberId},${league.id},${input.userId},clock_timestamp() FROM "League" WHERE id=${league.id} AND "startsAt">clock_timestamp() RETURNING id`
        if (!inserted.length) throw ApiError.conflict(ErrorCode.JOIN_WINDOW_CLOSED, 'Registration closed')
        await tx.fantasyTeam.update({ where: { id: team.id }, data: { leagueMemberId: memberId } })
        await replaceTeamRoster(tx, team.id, slots, initialLineup.captainExternalPlayerId ?? null)
        await createRecurringWeeklyDrafts(tx, { memberId, startsAt: league.startsAt, totalWeeks: league.totalWeeks, slots, captain: initialLineup.captainExternalPlayerId ?? null })
        return { leagueMemberId: memberId, tournamentId: league.id, fantasyTeamId: team.id }
    })
}

export async function saveRecurringLineup(db: PrismaClient, input: { userId: string; teamId: string; input: RecurringLineupInput }): Promise<void> {
    const initial = await db.fantasyTeam.findUnique({ where: { id: input.teamId }, include: { leagueMember: true } })
    if (!initial) throw ApiError.notFound(ErrorCode.TEAM_NOT_FOUND, 'Team not found')
    if (initial.userId !== input.userId) throw new ApiError(403, ErrorCode.TEAM_NOT_OWNED, 'Team is not owned by the viewer')
    if (!initial.leagueMember) throw ApiError.conflict(ErrorCode.USER_NOT_IN_TOURNAMENT, 'Team is not entered')
    await new RecurringEntryRepository(db).withLockedTournament(initial.leagueMember.leagueId, initial.id, async tx => {
        const league = await tx.league.findUniqueOrThrow({ where: { id: initial.leagueMember!.leagueId }, include: { recurringTournament: true } })
        const team = await tx.fantasyTeam.findUniqueOrThrow({ where: { id: initial.id } })
        if (!league.recurringTournament || team.leagueMemberId !== initial.leagueMemberId || ['COMPLETED', 'ARCHIVED', 'CANCELLED'].includes(league.status)) throw ApiError.conflict(ErrorCode.TOURNAMENT_NOT_JOINABLE, 'No editable weeks remain')
        const slots = canonicalRecurringSlots(input.input, league.recurringTournament.playerPool as unknown as DailyPlayer[])
        const captain = input.input.captainExternalPlayerId ?? null
        const future = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "WeeklyLineup" WHERE "leagueMemberId"=${team.leagueMemberId} AND "lockedAt">clock_timestamp() ORDER BY week FOR UPDATE`
        let changed = 0
        for (const lineup of future) {
            const updated = await tx.$executeRaw`UPDATE "WeeklyLineup" SET "captainExternalPlayerId"=${captain},"updatedAt"=clock_timestamp() WHERE id=${lineup.id} AND "lockedAt">clock_timestamp()`
            if (!updated) continue
            await tx.weeklyLineupSlot.deleteMany({ where: { weeklyLineupId: lineup.id } })
            await tx.weeklyLineupSlot.createMany({ data: slots.map(s => ({ ...s, weeklyLineupId: lineup.id })) })
            changed++
        }
        if (!changed) throw ApiError.conflict(ErrorCode.JOIN_WINDOW_CLOSED, 'No editable weeks remain')
        await replaceTeamRoster(tx, team.id, slots, captain)
    })
}
