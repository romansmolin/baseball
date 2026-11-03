import type { Prisma } from '../../../src/generated/prisma/client'
import type { DailyGame, DailyPlayer, SaveDailyEntryInput } from '@/shared/daily-contests'
import type { BaseballProviderLeague } from '@/shared/baseball'
import type { RecurringTemplateKey } from '@/shared/tournaments/recurring'

export interface MutationPermit {
    assertInTransaction(tx: Prisma.TransactionClient): Promise<void>
}

export interface RecurringWindow {
    templateKey: RecurringTemplateKey
    /** north-america is used by new mixed-source series; winter is legacy-only. */
    sourceSlug: 'north-america' | 'winter-leagues'
    startsAt: Date
    endsAt: Date
    totalWeeks: 1 | 2 | 4
    configurationVersion: 1
}

export interface RecurringGame extends DailyGame {
    sourceLeagueSlug?: BaseballProviderLeague
    originalStartUtc: string
    apiSeason: number
    week: number
    exclusion?: { reason: 'CANCELLED' | 'POSTPONED_TIMEOUT'; frozenSnapshotId: string | null }
}

export interface RecurringSourceSnapshot {
    games: RecurringGame[]
    playerPool: DailyPlayer[]
    checkedAt: string
}

export interface RecurringTournamentContext {
    leagueId: string
    publishedAt: Date
    window: RecurringWindow
    snapshot: RecurringSourceSnapshot
    demoTarget: number
    outcome: 'STANDARD' | 'VOID'
}

export type RecurringLineupInput = Pick<SaveDailyEntryInput, 'players' | 'captainExternalPlayerId'>
