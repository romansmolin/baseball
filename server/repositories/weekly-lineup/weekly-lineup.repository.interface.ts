import type {
    PlayerPosition,
    RosterSlotPosition,
} from '../../../src/generated/prisma/enums'

// Domain record for a snapshotted weekly lineup slot. Strings (not enums) on
// read so we don't tie the consumer to Prisma — they map cleanly to the
// existing `WeeklyScoreBreakdownSlot.slotPosition: string` contract.
export interface WeeklyLineupSlotRecord {
    externalPlayerId: number
    playerName: string
    // Stringified PlayerPosition enum — keep stable across DB/code.
    playerPosition: string
    playerTeamName: string
    playerPhotoUrl: string | null
    slotPosition: string
    salaryAtLock: number
}

export interface WeeklyLineupRecord {
    id: string
    leagueMemberId: string
    week: number
    captainExternalPlayerId: number | null
    lockedAt: Date
    slots: WeeklyLineupSlotRecord[]
}

export interface CreateWeeklyLineupSlotInput {
    externalPlayerId: number
    playerName: string
    playerPosition: PlayerPosition
    playerTeamName: string
    playerPhotoUrl: string | null
    slotPosition: RosterSlotPosition
    salaryAtLock: number
}

export interface CreateWeeklyLineupInput {
    leagueMemberId: string
    week: number
    captainExternalPlayerId: number | null
    lockedAt: Date
    slots: CreateWeeklyLineupSlotInput[]
}

export interface IWeeklyLineupRepository {
    findByMemberAndWeek(
        memberId: string,
        week: number,
    ): Promise<WeeklyLineupRecord | null>

    findManyByMember(memberId: string): Promise<WeeklyLineupRecord[]>

    /**
     * The distinct set of frozen team names + external player ids across every
     * lineup slot of the given members. Used to scope schedule/box-score
     * fetches to just the teams a tournament's rosters reference (frozen team
     * plus each player's current team, to catch mid-season trades).
     */
    findRosterFootprintByMembers(
        memberIds: string[],
    ): Promise<{ teamNames: string[]; externalPlayerIds: number[] }>

    /**
     * Idempotent: if a row already exists for (memberId, week), return it
     * without modification. The first snapshot wins — we never overwrite a
     * locked week.
     */
    createIfMissing(input: CreateWeeklyLineupInput): Promise<WeeklyLineupRecord>
}
