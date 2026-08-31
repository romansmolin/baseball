// Adds existing bulk demo accounts to the current active tournament catalogue.
// Unlike `prisma/seed.ts`, this never deletes or recreates tournament data.
//
//   npm run db:enroll-demo-users          # up to 10,000 users
//   npm run db:enroll-demo-users -- 5000  # custom limit
//   npm run db:enroll-demo-users -- --rollback-latest 5000
//   npm run db:enroll-demo-users -- --summary
//   npm run db:enroll-demo-users -- --add-rosters
//   npm run db:enroll-demo-users -- --backfill-demo-scores

import 'dotenv/config'

import { randomUUID } from 'node:crypto'

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import {
    LeagueStatus,
    PlayerPosition,
    RosterSlotPosition,
    WeeklyScoreState,
} from '../src/generated/prisma/enums'

const DEFAULT_COUNT = 10_000
const CHUNK_SIZE = 1_000

const ROSTER_TEMPLATE = [
    { id: 660271, name: 'Shohei Ohtani', position: PlayerPosition.P, team: 'Los Angeles Dodgers', slot: RosterSlotPosition.P },
    { id: 669373, name: 'Tarik Skubal', position: PlayerPosition.P, team: 'Detroit Tigers', slot: RosterSlotPosition.P },
    { id: 592663, name: 'J.T. Realmuto', position: PlayerPosition.C, team: 'Philadelphia Phillies', slot: RosterSlotPosition.C },
    { id: 669257, name: 'Will Smith', position: PlayerPosition.C, team: 'Los Angeles Dodgers', slot: RosterSlotPosition.C },
    { id: 621566, name: 'Matt Olson', position: PlayerPosition.FIRST_BASE, team: 'Atlanta Braves', slot: RosterSlotPosition.FIRST_BASE },
    { id: 518692, name: 'Freddie Freeman', position: PlayerPosition.FIRST_BASE, team: 'Los Angeles Dodgers', slot: RosterSlotPosition.FIRST_BASE },
    { id: 665487, name: 'Ozzie Albies', position: PlayerPosition.SECOND_BASE, team: 'Atlanta Braves', slot: RosterSlotPosition.SECOND_BASE },
    { id: 671277, name: 'Jose Altuve', position: PlayerPosition.SECOND_BASE, team: 'Houston Astros', slot: RosterSlotPosition.SECOND_BASE },
    { id: 608070, name: 'Jose Ramirez', position: PlayerPosition.THIRD_BASE, team: 'Cleveland Guardians', slot: RosterSlotPosition.THIRD_BASE },
    { id: 646240, name: 'Rafael Devers', position: PlayerPosition.THIRD_BASE, team: 'Boston Red Sox', slot: RosterSlotPosition.THIRD_BASE },
    { id: 596019, name: 'Francisco Lindor', position: PlayerPosition.SS, team: 'New York Mets', slot: RosterSlotPosition.SS },
    { id: 677951, name: 'Bobby Witt Jr.', position: PlayerPosition.SS, team: 'Kansas City Royals', slot: RosterSlotPosition.SS },
    { id: 592450, name: 'Aaron Judge', position: PlayerPosition.OF, team: 'New York Yankees', slot: RosterSlotPosition.OF },
    { id: 660670, name: 'Ronald Acuna Jr.', position: PlayerPosition.OF, team: 'Atlanta Braves', slot: RosterSlotPosition.OF },
    { id: 545361, name: 'Mike Trout', position: PlayerPosition.OF, team: 'Los Angeles Angels', slot: RosterSlotPosition.OF },
    { id: 665742, name: 'Juan Soto', position: PlayerPosition.OF, team: 'New York Mets', slot: RosterSlotPosition.OF },
] as const

function shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[items[i], items[j]] = [items[j], items[i]]
    }
    return items
}

function currentWeek(tournament: {
    status: LeagueStatus
    startsAt: Date
    totalWeeks: number
}): number {
    if (tournament.status === LeagueStatus.DRAFTING) return 0
    const elapsedWeeks = Math.floor((Date.now() - tournament.startsAt.getTime()) / 604_800_000)
    return Math.min(tournament.totalWeeks, Math.max(1, elapsedWeeks + 1))
}

function rosterFor(seed: string) {
    let hash = 0
    for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
    const picks = [
        RosterSlotPosition.P,
        RosterSlotPosition.C,
        RosterSlotPosition.FIRST_BASE,
        RosterSlotPosition.SECOND_BASE,
        RosterSlotPosition.THIRD_BASE,
        RosterSlotPosition.SS,
        RosterSlotPosition.OF,
        RosterSlotPosition.OF,
        RosterSlotPosition.OF,
    ]
    return picks.map((slot, index) => {
        const candidates = ROSTER_TEMPLATE.filter((player) => player.slot === slot)
        const player = candidates[(hash + index) % candidates.length]
        return {
            externalPlayerId: player.id,
            playerName: player.name,
            playerPosition: player.position,
            playerTeamName: player.team,
            slotPosition: slot,
            salaryAtLock: 3000 + (player.id % 8) * 1000,
        }
    })
}

async function createManyChunked<T>(
    create: (data: T[]) => Promise<unknown>,
    rows: T[],
): Promise<void> {
    for (let start = 0; start < rows.length; start += CHUNK_SIZE) {
        await create(rows.slice(start, start + CHUNK_SIZE))
    }
}

async function main(): Promise<void> {
    const rollbackCount =
        process.argv[2] === '--rollback-latest'
            ? Math.trunc(Number(process.argv[3]))
            : null
    const summaryOnly = process.argv[2] === '--summary'
    const addRosters = process.argv[2] === '--add-rosters'
    const backfillDemoScores = process.argv[2] === '--backfill-demo-scores'
    const requested = Math.trunc(Number(process.argv[2] ?? DEFAULT_COUNT))
    if (rollbackCount !== null && (!Number.isFinite(rollbackCount) || rollbackCount < 1)) {
        throw new Error('Usage: jiti prisma/enroll-demo-users.ts --rollback-latest <positive count>')
    }
    if (!Number.isFinite(requested) || requested < 1) {
        if (rollbackCount === null && !summaryOnly && !addRosters && !backfillDemoScores) {
            throw new Error('Usage: jiti prisma/enroll-demo-users.ts <positive count>')
        }
    }

    const prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
        log: ['error'],
    })

    try {
        if (backfillDemoScores) {
            const members = await prisma.leagueMember.findMany({
                where: {
                    user: { provider: 'demo' },
                    fantasyTeam: { name: { startsWith: 'Demo demo' } },
                },
                select: {
                    id: true,
                    pointsFor: true,
                    weeklyScores: { select: { week: true } },
                    league: {
                        select: {
                            status: true,
                            startsAt: true,
                            totalWeeks: true,
                            scoringRuleId: true,
                        },
                    },
                },
            })
            const rows = members.flatMap((member) => {
                const existingWeeks = new Set(member.weeklyScores.map((score) => score.week))
                const throughWeek = currentWeek(member.league)
                return Array.from({ length: throughWeek }, (_, index) => index + 1)
                    .filter((week) => !existingWeeks.has(week))
                    .map((week) => ({
                        leagueMemberId: member.id,
                        week,
                        points: week === throughWeek ? member.pointsFor : 0,
                        state: WeeklyScoreState.FINAL,
                        staleAt: new Date('2100-01-01T00:00:00.000Z'),
                        breakdown: { source: 'demo-enrollment-backfill' },
                        scoringRuleId: member.league.scoringRuleId,
                    }))
            })
            await createManyChunked(
                (data) => prisma.weeklyScoreCache.createMany({ data, skipDuplicates: true }),
                rows,
            )
            console.log(`Backfilled ${rows.length} final demo score row(s).`)
            return
        }

        if (addRosters) {
            const teams = await prisma.fantasyTeam.findMany({
                where: {
                    user: { provider: 'demo' },
                    name: { startsWith: 'Demo demo' },
                    rosterSlots: { none: {} },
                    leagueMember: { is: { weeklyLineups: { none: {} } } },
                },
                select: {
                    id: true,
                    leagueMember: {
                        select: {
                            id: true,
                            league: { select: { status: true, startsAt: true, totalWeeks: true } },
                        },
                    },
                },
            })
            const rosterRows = teams.flatMap((team) =>
                rosterFor(team.id).map((slot) => ({ fantasyTeamId: team.id, ...slot })),
            )
            await createManyChunked(
                (data) => prisma.rosterSlot.createMany({ data }),
                rosterRows,
            )

            const lineups = teams.flatMap((team) => {
                const member = team.leagueMember
                if (!member) return []
                const week = currentWeek(member.league)
                return week === 0
                    ? []
                    : [{
                        id: randomUUID(),
                        leagueMemberId: member.id,
                        week,
                        lockedAt: new Date(member.league.startsAt.getTime() + (week - 1) * 604_800_000),
                        teamId: team.id,
                    }]
            })
            await createManyChunked(
                (data) => prisma.weeklyLineup.createMany({
                    data: data.map((lineup) => ({
                        id: lineup.id,
                        leagueMemberId: lineup.leagueMemberId,
                        week: lineup.week,
                        lockedAt: lineup.lockedAt,
                    })),
                }),
                lineups,
            )
            const lineupSlots = lineups.flatMap((lineup) =>
                rosterFor(lineup.teamId).map((slot) => ({ weeklyLineupId: lineup.id, ...slot })),
            )
            await createManyChunked(
                (data) => prisma.weeklyLineupSlot.createMany({ data }),
                lineupSlots,
            )
            console.log(
                `Added ${rosterRows.length} roster slot(s) and ${lineups.length} current-week lineup(s) for ${teams.length} demo team(s).`,
            )
            return
        }

        if (summaryOnly) {
            const [grouped, rosterSlots, lineups] = await Promise.all([
                prisma.leagueMember.groupBy({
                    by: ['leagueId'],
                    where: {
                        user: { provider: 'demo' },
                        fantasyTeam: { name: { startsWith: 'Demo demo' } },
                    },
                    _count: { _all: true },
                }),
                prisma.rosterSlot.count({
                    where: {
                        fantasyTeam: {
                            user: { provider: 'demo' },
                            name: { startsWith: 'Demo demo' },
                        },
                    },
                }),
                prisma.weeklyLineup.count({
                    where: {
                        leagueMember: {
                            user: { provider: 'demo' },
                            fantasyTeam: { name: { startsWith: 'Demo demo' } },
                        },
                    },
                }),
            ])
            const counts = grouped.map((row) => row._count._all)
            console.log(
                `Script enrollments: ${counts.reduce((sum, count) => sum + count, 0)} across ${counts.length} tournament(s); ${Math.min(...counts)}–${Math.max(...counts)} per tournament.`,
            )
            console.log(`Rosters: ${rosterSlots} slot(s); current-week lineups: ${lineups}.`)
            return
        }

        if (rollbackCount !== null) {
            const latest = await prisma.leagueMember.findMany({
                where: {
                    user: { provider: 'demo' },
                    fantasyTeam: { name: { startsWith: 'Demo demo' } },
                },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                take: rollbackCount,
                select: { id: true },
            })
            if (latest.length !== rollbackCount) {
                throw new Error(
                    `Refusing rollback: found only ${latest.length} demo enrollment(s), expected ${rollbackCount}.`,
                )
            }
            const deleted = await prisma.leagueMember.deleteMany({
                where: { id: { in: latest.map((member) => member.id) } },
            })
            console.log(`Rolled back ${deleted.count} latest demo enrollment(s).`)
            return
        }

        const tournaments = await prisma.league.findMany({
            where: {
                status: {
                    in: [
                        LeagueStatus.DRAFTING,
                        LeagueStatus.IN_SEASON,
                        LeagueStatus.PLAYOFFS,
                    ],
                },
            },
            select: {
                id: true,
                leagueSlug: true,
                name: true,
                status: true,
                startsAt: true,
                totalWeeks: true,
                scoringRuleId: true,
            },
            orderBy: { createdAt: 'asc' },
        })
        if (tournaments.length === 0) {
            throw new Error('No active tournaments found; nothing was changed.')
        }

        // A user may only receive one seeded entry. This also makes reruns
        // safe: already-enrolled demo users are not selected again.
        // Repair the baseline-score records for any users added by an earlier
        // version of this command. The name prefix is unique to this script.
        const existingDemoMembers = await prisma.leagueMember.findMany({
            where: {
                user: { provider: 'demo' },
                fantasyTeam: { name: { startsWith: 'Demo demo' } },
                weeklyScores: { none: {} },
            },
            select: {
                id: true,
                pointsFor: true,
                league: {
                    select: {
                        status: true,
                        startsAt: true,
                        totalWeeks: true,
                        scoringRuleId: true,
                    },
                },
            },
        })
        const repairScores = existingDemoMembers.flatMap((member) => {
            const week = currentWeek(member.league)
            return week === 0
                ? []
                : [{
                    leagueMemberId: member.id,
                    week,
                    points: member.pointsFor,
                    state: WeeklyScoreState.FINAL,
                    staleAt: new Date('2100-01-01T00:00:00.000Z'),
                    breakdown: { source: 'demo-enrollment' },
                    scoringRuleId: member.league.scoringRuleId,
                }]
        })
        await createManyChunked(
            (data) => prisma.weeklyScoreCache.createMany({ data }),
            repairScores,
        )

        const availableUsers = await prisma.user.findMany({
            where: { provider: 'demo', leagueMembers: { none: {} } },
            select: { id: true, username: true },
        })
        const users = shuffle(availableUsers).slice(0, requested)
        if (users.length === 0) {
            console.log(
                `No unenrolled demo users found; restored ${repairScores.length} baseline score(s).`,
            )
            return
        }

        const allocation = shuffle([...tournaments])
        const startedAt = Date.now()
        console.log(
            `Enrolling ${users.length} demo users across ${allocation.length} active tournament(s)…`,
        )

        for (let start = 0; start < users.length; start += CHUNK_SIZE) {
            const batch = users.slice(start, start + CHUNK_SIZE)
            const members = batch.map((user, offset) => {
                const tournament = allocation[(start + offset) % allocation.length]
                return {
                    id: randomUUID(),
                    userId: user.id,
                    leagueId: tournament.id,
                    // Seeded baseline only. The weekly scoring cron will
                    // subsequently write authoritative scores.
                    pointsFor: Math.round((25 + Math.random() * 475) * 100) / 100,
                    wins: Math.floor(Math.random() * 12),
                    losses: Math.floor(Math.random() * 12),
                    tournament,
                    username: user.username ?? 'demo',
                }
            })

            await prisma.$transaction(async (tx) => {
                await tx.leagueMember.createMany({
                    data: members.map((member) => ({
                        id: member.id,
                        userId: member.userId,
                        leagueId: member.leagueId,
                        pointsFor: member.pointsFor,
                        wins: member.wins,
                        losses: member.losses,
                    })),
                })
                await tx.fantasyTeam.createMany({
                    data: members.map((member, index) => ({
                        id: randomUUID(),
                        userId: member.userId,
                        leagueMemberId: member.id,
                        name: `Demo ${member.username} #${start + index + 1}`,
                        leagueSlug: member.tournament.leagueSlug,
                        format: 'season_long',
                    })),
                })
                const scoreRows = members.flatMap((member) => {
                    const week = currentWeek(member.tournament)
                    return week === 0
                        ? []
                        : [{
                            leagueMemberId: member.id,
                            week,
                            points: member.pointsFor,
                            state: WeeklyScoreState.FINAL,
                            staleAt: new Date('2100-01-01T00:00:00.000Z'),
                            breakdown: { source: 'demo-enrollment' },
                            scoringRuleId: member.tournament.scoringRuleId,
                        }]
                })
                if (scoreRows.length > 0) {
                    await tx.weeklyScoreCache.createMany({ data: scoreRows })
                }
            })
            console.log(`  + ${Math.min(start + batch.length, users.length)}/${users.length}`)
        }

        const seconds = ((Date.now() - startedAt) / 1000).toFixed(1)
        console.log(`Done — enrolled ${users.length} demo users in ${seconds}s.`)
        console.log('No entry fees, ledger rows, rosters, or historical lineups were created.')
    } finally {
        await prisma.$disconnect()
    }
}

main().catch((error) => {
    console.error('enroll-demo-users failed:', error)
    process.exit(1)
})
