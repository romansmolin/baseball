import { createHash } from 'node:crypto'
import type { PrismaClient } from '../../../src/generated/prisma/client'
import type { ProviderBoxScore } from '../../providers/dto/provider-schedule.dto'
import type { ISportsProvider } from '../../providers/sports-provider.interface'
import type { BaseballProviderLeague } from '@/shared/baseball'
import { NORTH_AMERICA_CONTEST_SOURCE } from '../../providers/contest-source-registry'
import { GameSnapshotsRepository } from '../../repositories/game-snapshots/game-snapshots.repository'
import { loadDailySchedule, loadNorthAmericanContestSchedule } from '../daily-contests/daily-schedule.service'
import { parseScoringRule } from '../scoring/scoring-rule.schema'
import { evaluateRecurringWeek, scoreRecurringSlots, type GameObservation } from './recurring-lifecycle'
import type { MutationPermit, RecurringGame } from './recurring.types'

export interface RecurringScoreSummary {
    entriesUpdated: number
    weeksFinalized: number
    pendingGames: number
    excludedGames: number
    outcome: 'STANDARD' | 'VOID'
    timedOut: boolean
}

export async function refreshRecurringScores(db: PrismaClient, provider: ISportsProvider, input: { leagueId: string; now: Date; permit: MutationPermit; deadline: number }): Promise<RecurringScoreSummary> {
    const summary: RecurringScoreSummary = { entriesUpdated: 0, weeksFinalized: 0, pendingGames: 0, excludedGames: 0, outcome: 'STANDARD', timedOut: false }
    const league = await db.league.findUnique({ where: { id: input.leagueId }, include: { recurringTournament: true, scoringRule: true } })
    if (!league?.recurringTournament) throw new Error('Recurring tournament not found')
    if (league.status === 'COMPLETED' || league.status === 'CANCELLED' || input.now < league.startsAt) return summary
    const timeLeft = () => Date.now() + 500 < input.deadline
    let games = league.recurringTournament.games as unknown as RecurringGame[]
    const snapshotRepo = new GameSnapshotsRepository(db)
    const saved = await snapshotRepo.findMany(games.map(g => g.gamePk))
    const byId = new Map(saved.map(row => [row.gamePk, row]))
    const sourceFor = (game: RecurringGame): BaseballProviderLeague | undefined => game.sourceLeagueSlug
        ?? (league.recurringTournament!.sourceSlug === NORTH_AMERICA_CONTEST_SOURCE ? undefined : league.recurringTournament!.sourceSlug as BaseballProviderLeague)
    const due = games.filter(game => !game.exclusion && Date.parse(game.originalStartUtc) <= input.now.getTime()).filter(game => {
        const row = byId.get(game.gamePk)
        const box = row?.boxScore as unknown as ProviderBoxScore | null | undefined
        const complete = row?.complete && (row.status === 'CANCELLED' || (row.status === 'FINAL' && Array.isArray(box?.batters) && box.batters.length > 0 && Array.isArray(box.pitchers) && box.pitchers.length > 0))
        return !row || (!complete && input.now.getTime() - row.observedAt.getTime() >= 15 * 60000)
    })
    let statuses = new Map<string, string>()
    if (due.length && timeLeft()) {
        try {
            const startDateUtc = league.startsAt
            const endDateUtc = new Date(league.endsAt.getTime() + 72 * 3600000)
            const sourceSlug = league.recurringTournament.sourceSlug
            const schedule = sourceSlug === NORTH_AMERICA_CONTEST_SOURCE
                ? await loadNorthAmericanContestSchedule(provider, { startDateUtc, endDateUtc, revalidateSeconds: 60 })
                : await loadDailySchedule(provider, { league: sourceSlug as BaseballProviderLeague, startDateUtc, endDateUtc, revalidateSeconds: 60 })
            statuses = new Map(schedule.map(row => [`${row.sourceLeagueSlug ?? sourceSlug}:${row.game.gamePk}`, row.game.status]))
        } catch (error) {
            if (error instanceof Error && error.name === 'WorkDeadlineError') throw error
        }
    }
    for (const game of due) {
        if (!timeLeft()) { summary.timedOut = true; break }
        const sourceLeague = sourceFor(game)
        if (!sourceLeague) continue
        const status = statuses.get(`${sourceLeague}:${game.gamePk}`) ?? game.status
        let box: ProviderBoxScore | null = null
        try { if (status !== 'CANCELLED') box = await provider.getBoxScore(game.gamePk, { league: sourceLeague, deadline: input.deadline }) }
        catch (error) { if (error instanceof Error && error.name === 'WorkDeadlineError') throw error }
        const actualStatus = box?.status ?? status
        const complete = actualStatus === 'FINAL' && !!box?.batters.length && !!box.pitchers.length
        await snapshotRepo.save({ gamePk: game.gamePk, leagueSlug: sourceLeague, status: actualStatus, boxScore: box, complete, observedAt: input.now }, input.permit)
    }
    const currentSnapshots = await snapshotRepo.findMany(games.map(g => g.gamePk))
    const observations: GameObservation[] = currentSnapshots.map(row => ({ gamePk: row.gamePk, status: row.status, complete: row.complete, boxScore: row.boxScore as unknown as ProviderBoxScore | null }))
    const candidates = games.filter(game => {
        if (game.exclusion || !sourceFor(game)) return false
        const status = observations.find(row => row.gamePk === game.gamePk)?.status ?? game.status
        return status === 'CANCELLED' || ((status === 'POSTPONED' || status === 'SUSPENDED') && input.now.getTime() >= Date.parse(game.originalStartUtc) + 72 * 3600000)
    })
    if (candidates.length && timeLeft()) {
        games = await db.$transaction(async tx => {
            await input.permit.assertInTransaction(tx)
            await tx.$queryRaw`SELECT id FROM "League" WHERE id=${league.id} FOR UPDATE`
            const current = await tx.recurringTournament.findUniqueOrThrow({ where: { leagueId: league.id } })
            const fresh = current.games as unknown as RecurringGame[]
            for (const game of fresh) {
                if (game.exclusion || !candidates.some(candidate => candidate.gamePk === game.gamePk)) continue
                const observation = observations.find(row => row.gamePk === game.gamePk)
                const reason = (observation?.status ?? game.status) === 'CANCELLED' ? 'CANCELLED' : 'POSTPONED_TIMEOUT'
                let frozenSnapshotId: string | null = null
                const snapshot = currentSnapshots.find(row => row.gamePk === game.gamePk)
                const box = observation?.boxScore
                if (reason === 'POSTPONED_TIMEOUT' && snapshot && box && (box.batters.length || box.pitchers.length)) {
                    const archive = await tx.archivedGameSnapshot.upsert({ where: { gamePk_observedAt: { gamePk: game.gamePk, observedAt: snapshot.observedAt } }, create: { gamePk: game.gamePk, observedAt: snapshot.observedAt, boxScore: JSON.parse(JSON.stringify(box)) }, update: {} })
                    frozenSnapshotId = archive.id
                }
                game.exclusion = { reason, frozenSnapshotId }
            }
            await tx.recurringTournament.update({ where: { leagueId: league.id }, data: { games: JSON.parse(JSON.stringify(fresh)) } })
            return fresh
        })
    }
    const frozenIds = games.flatMap(game => game.exclusion?.frozenSnapshotId ? [game.exclusion.frozenSnapshotId] : [])
    const archived = await db.archivedGameSnapshot.findMany({ where: { id: { in: frozenIds } } })
    const frozen = new Map(archived.map(row => [row.id, row.boxScore as unknown as ProviderBoxScore]))
    const rule = parseScoringRule(league.scoringRule.rules)
    const members = await db.leagueMember.findMany({ where: { leagueId: league.id }, select: { id: true, userId: true }, orderBy: [{ userId: 'asc' }, { id: 'asc' }] })
    let allFinal = !summary.timedOut
    let allVoid = true
    for (let week = 1; week <= league.totalWeeks; week++) {
        const startsAt = new Date(league.startsAt.getTime() + (week - 1) * 7 * 86400000)
        const endsAt = new Date(startsAt.getTime() + 7 * 86400000)
        if (input.now < startsAt) { allFinal = false; continue }
        const weekGames = games.filter(g => g.week === week)
        const evaluation = evaluateRecurringWeek(weekGames, observations, endsAt, input.now, frozen)
        // Timeout decisions require a persisted frozen observation before they can be final.
        const pendingTimeouts = evaluation.exclusions.filter(e => e.reason === 'POSTPONED_TIMEOUT' && !weekGames.find(game => game.gamePk === e.gamePk)?.exclusion)
        if (pendingTimeouts.length) { evaluation.state = 'PARTIAL'; evaluation.outcome = 'STANDARD' }
        summary.pendingGames += evaluation.pendingGamePks.length + pendingTimeouts.length
        summary.excludedGames += evaluation.exclusions.length
        if (evaluation.outcome !== 'VOID') allVoid = false
        const memberIds = members.map(m => m.id)
        const lineups = await db.weeklyLineup.findMany({ where: { week, leagueMemberId: { in: memberIds } }, include: { slots: true } })
        const validLineups = lineups.filter(lineup => {
            const counts = new Map<string, number>()
            for (const slot of lineup.slots) counts.set(slot.slotPosition, (counts.get(slot.slotPosition) ?? 0) + 1)
            return lineup.slots.length === 9 && new Set(lineup.slots.map(slot => slot.externalPlayerId)).size === 9
                && ['P', 'C', 'FIRST_BASE', 'SECOND_BASE', 'THIRD_BASE', 'SS'].every(slot => counts.get(slot) === 1)
                && counts.get('OF') === 3
                && (lineup.captainExternalPlayerId === null || lineup.slots.some(slot => slot.externalPlayerId === lineup.captainExternalPlayerId))
        })
        const lineupByMember = new Map(validLineups.map(row => [row.leagueMemberId, row]))
        if (validLineups.length !== members.length) allFinal = false
        const lineupVersions = lineups.map(lineup => ({ memberId: lineup.leagueMemberId, id: lineup.id, updatedAt: lineup.updatedAt, slots: lineup.slots.map(slot => slot.id).sort() })).sort((a, b) => a.memberId.localeCompare(b.memberId))
        const fingerprint = createHash('sha256').update(JSON.stringify({ week, evaluation, members: memberIds, lineupVersions })).digest('hex')
        const jobKey = `recurring:score:${league.id}:w${week}`
        const job = await db.showcaseJob.findUnique({ where: { key: jobKey } })
        const cursor = job?.cursor as { fingerprint?: string; offset?: number; done?: boolean } | null
        let offset = cursor?.fingerprint === fingerprint ? cursor.offset ?? 0 : 0
        while (offset < members.length && timeLeft()) {
            const batch = members.slice(offset, offset + 25)
            const next = offset + batch.length
            await db.$transaction(async tx => {
                await input.permit.assertInTransaction(tx)
                await tx.$queryRaw`SELECT id FROM "League" WHERE id=${league.id} FOR UPDATE`
                let written = 0
                for (const member of batch) {
                    const lineup = lineupByMember.get(member.id)
                    if (!lineup) continue
                    const scored = scoreRecurringSlots(lineup.slots, lineup.captainExternalPlayerId, evaluation.boxes, rule)
                    const breakdown = { slots: scored.slots, rule: { name: league.scoringRule.name, version: league.scoringRule.version }, outcome: evaluation.outcome, exclusions: evaluation.exclusions, observedGames: evaluation.boxes.length }
                    const data = { points: scored.points, state: evaluation.state, staleAt: evaluation.state === 'FINAL' ? new Date('2100-01-01T00:00:00Z') : new Date(input.now.getTime() + 15 * 60000), breakdown: JSON.parse(JSON.stringify(breakdown)), scoringRuleId: league.scoringRuleId }
                    await tx.weeklyScoreCache.upsert({ where: { leagueMemberId_week: { leagueMemberId: member.id, week } }, create: { leagueMemberId: member.id, week, ...data }, update: data })
                    summary.entriesUpdated++
                    written++
                }
                await tx.showcaseJob.upsert({ where: { key: jobKey }, create: { key: jobKey, cursor: { fingerprint, offset: next, done: next === members.length } }, update: { cursor: { fingerprint, offset: next, done: next === members.length } } })
                if (written) await tx.recurringTournament.update({ where: { leagueId: league.id }, data: { lastScoredAt: input.now } })
            }, { timeout: Math.max(1000, Math.min(10000, input.deadline - Date.now())) })
            offset = next
        }
        if (offset < members.length) { summary.timedOut = true; allFinal = false; break }
        if (evaluation.state === 'FINAL' && validLineups.length === members.length) summary.weeksFinalized++
        else allFinal = false
    }
    if (timeLeft()) {
        await db.$transaction(async tx => {
            await input.permit.assertInTransaction(tx)
            await tx.$queryRaw`SELECT id FROM "League" WHERE id=${league.id} FOR UPDATE`
            const current = await tx.league.findUniqueOrThrow({ where: { id: league.id } })
            if (['COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(current.status)) return
            const done = input.now >= league.endsAt && allFinal
            summary.outcome = done && allVoid ? 'VOID' : 'STANDARD'
            await tx.league.update({ where: { id: league.id }, data: { status: done ? (allVoid ? 'CANCELLED' : 'COMPLETED') : 'IN_SEASON' } })
            if (done && allVoid) await tx.recurringTournament.update({ where: { leagueId: league.id }, data: { outcome: 'VOID' } })
        })
    } else summary.timedOut = true
    return summary
}
