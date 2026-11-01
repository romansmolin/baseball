import type { Prisma } from '../../../src/generated/prisma/client'
import type { DailyEntrySlot, SaveDailyEntryInput } from '@/shared/daily-contests'
import { assertWorkTime } from './work-deadline'

export interface DemoBatchRow {
    profile: { userId: string }
    picks: SaveDailyEntryInput
    lineup: DailyEntrySlot[]
    at: Date
}

export async function writeDemoBatch(tx: Prisma.TransactionClient, contest: { id: string; name: string }, rows: DemoBatchRow[]): Promise<void> {
    if (!rows.length) return
    assertWorkTime(500)
    await tx.dailyEntry.createMany({ data: rows.map(row => ({ contestId: contest.id, userId: row.profile.userId, teamName: row.picks.teamName, captainExternalPlayerId: row.picks.captainExternalPlayerId, lineup: JSON.parse(JSON.stringify(row.lineup)), createdAt: row.at })), skipDuplicates: true })
    const entries = await tx.dailyEntry.findMany({ where: { contestId: contest.id, userId: { in: rows.map(row => row.profile.userId) } }, select: { id: true, userId: true } })
    const byUser = new Map(entries.map(entry => [entry.userId, entry.id]))
    const events = rows.map(row => {
        const id = byUser.get(row.profile.userId)
        if (!id) throw new Error('Unable to resolve a scheduled demo entry')
        return { sourceKey: `entry_joined:${id}`, kind: 'ENTRY_JOINED', userId: row.profile.userId, contestId: contest.id, occurredAt: row.at, payload: { detail: `Joined ${contest.name}` } }
    })
    await tx.communityEvent.createMany({ data: events, skipDuplicates: true })
}
