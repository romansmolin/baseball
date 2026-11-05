import { createHash } from 'node:crypto'
import type { PrismaClient } from '../../../src/generated/prisma/client'
import type { ISportsProvider } from '../../providers/sports-provider.interface'
import { RecurringRepository } from '../../repositories/recurring-tournaments/recurring.repository'
import { contestGameTimes, inspectRecurringSource, windowHasGamesEveryWeek, type RosterSeed, type SourceCheckpoint } from './recurring-source.service'
import { DEFAULT_RECURRING_HORIZON_DAYS, planRecurringStarts, type RecurringSource } from './recurring-calendar'
import type { MutationPermit, RecurringWindow } from './recurring.types'

export type PublishRecurringOptions = { now: Date; horizonDays?: number; sources?: readonly RecurringSource[]; deadline?: number; checkpoint?: SourceCheckpoint } & ({ dryRun: true } | { dryRun: false; permit: MutationPermit })
export interface RecurringPublishSummary {
    created: number
    existing: number
    candidates: { window: RecurringWindow; games: number; players: number; demoTarget: number }[]
    skipped: { window: RecurringWindow; reason: string }[]
    checkpoint?: SourceCheckpoint
}

/** Longer series draw more entries; the exact number differs from one start to the next. */
const DEMO_TARGET_RANGE: Record<RecurringWindow['totalWeeks'], readonly [number, number]> = { 1: [200, 700], 2: [300, 1100], 4: [500, 1600] }

export function recurringDemoTarget(window: RecurringWindow): number {
    const [low, high] = DEMO_TARGET_RANGE[window.totalWeeks]
    return low + createHash('sha256').update(`${window.templateKey}:${window.sourceSlug}:${window.startsAt.toISOString()}`).digest().readUInt32BE(0) % (high - low + 1)
}

export async function ensureRecurringCommissioner(db: PrismaClient, permit: MutationPermit): Promise<string> {
    return db.$transaction(async tx => {
        await permit.assertInTransaction(tx)
        const id = 'recurring-system'
        const existing = await tx.user.findUnique({ where: { id } })
        if (existing && (existing.provider !== 'system' || existing.email !== 'recurring-system@managers.invalid')) throw new Error('System commissioner identity conflicts with an existing account')
        const owner = await tx.user.upsert({ where: { id }, create: { id, email: 'recurring-system@managers.invalid', name: 'BaseballFantasy', provider: 'system', role: 'COMMISSIONER' }, update: {} })
        return owner.id
    })
}

export async function publishRecurringTournaments(db: PrismaClient, provider: ISportsProvider, options: PublishRecurringOptions): Promise<RecurringPublishSummary> {
    const summary: RecurringPublishSummary = { created: 0, existing: 0, candidates: [], skipped: [] }
    const horizonDays = options.horizonDays ?? DEFAULT_RECURRING_HORIZON_DAYS
    let windows = planRecurringStarts(options.now, horizonDays, options.sources)
    if (horizonDays > DEFAULT_RECURRING_HORIZON_DAYS && windows.length) {
        // Most far-off windows have no games. Read the schedule once rather than per window,
        // or a tick's budget runs out before it reaches the windows that do.
        const last = windows[windows.length - 1].endsAt
        const timesBySource = new Map<RecurringSource, number[] | undefined>()
        for (const source of new Set(windows.map(window => window.sourceSlug))) timesBySource.set(source, await contestGameTimes(provider, options.now, last, source))
        windows = windows.filter(window => {
            const times = timesBySource.get(window.sourceSlug)
            return times === undefined || windowHasGamesEveryWeek(window, times)
        })
    }
    const saved = options.checkpoint
    if (saved) windows.sort((a, b) => Number(saved.windowKey.includes(b.startsAt.toISOString())) - Number(saved.windowKey.includes(a.startsAt.toISOString())))
    const rule = await db.scoringRule.findFirst({ where: { isDefault: true }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] })
    const repository = new RecurringRepository(db)
    let commissionerId: string | undefined
    let rosterSeed: RosterSeed | undefined
    for (const window of windows) {
        if (options.deadline !== undefined && Date.now() + 500 >= options.deadline) break
        const existing = await db.recurringTournament.findUnique({ where: { templateKey_sourceSlug_startsAt: { templateKey: window.templateKey, sourceSlug: window.sourceSlug, startsAt: window.startsAt } } })
        if (existing) { summary.existing++; continue }
        if (!rule) { summary.skipped.push({ window, reason: 'NO_SCORING_RULE' }); continue }
        const checkpoint = saved?.windowKey.includes(`${window.templateKey}:${window.sourceSlug}:${window.startsAt.toISOString()}:`) ? saved : undefined
        const inspected = await inspectRecurringSource(provider, window, { historical: false, checkpoint, deadline: options.deadline, rosterSeed })
        if (!inspected.ok) {
            if (inspected.reason === 'INCOMPLETE_BATCH') { summary.checkpoint = inspected.checkpoint; break }
            summary.skipped.push({ window, reason: inspected.reason }); continue
        }
        rosterSeed = inspected.seed
        const demoTarget = recurringDemoTarget(window)
        summary.candidates.push({ window, games: inspected.snapshot.games.length, players: inspected.snapshot.playerPool.length, demoTarget })
        if (options.dryRun) continue
        commissionerId ??= await ensureRecurringCommissioner(db, options.permit)
        try {
            const result = await repository.createIfMissing({ window, snapshot: inspected.snapshot, demoTarget, scoringRuleId: rule.id, commissionerId, mode: 'FUTURE' }, options.permit)
            if (result.created) summary.created++; else summary.existing++
        } catch (error) {
            if (error instanceof Error && error.message === 'Registration closed') summary.skipped.push({ window, reason: 'REGISTRATION_CLOSED' })
            else throw error
        }
    }
    return summary
}
