import 'dotenv/config'

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import {
    DraftType,
    LeagueStatus,
    LeagueVisibility,
    PlayerPosition,
    RosterSlotPosition,
} from '../src/generated/prisma/enums'
import { computeTournamentCurrentWeek } from '../server/services/tournaments/tournament-week.util'
import { tournamentWeekRange } from '../server/services/tournaments/tournament-week-range.util'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter, log: ['error'] })

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const now = Date.now()

async function main() {
    // 1) Ensure a default ScoringRule exists. Versioned: name+version unique.
    let scoringRule = await prisma.scoringRule.findFirst({
        where: { name: 'standard', version: 1 },
    })

    if (!scoringRule) {
        scoringRule = await prisma.scoringRule.create({
            data: {
                name: 'standard',
                version: 1,
                isDefault: true,
                rules: {
                    single: 3,
                    double: 5,
                    triple: 8,
                    homeRun: 10,
                    rbi: 2,
                    runScored: 2,
                    stolenBase: 5,
                    walk: 2,
                    strikeoutBatter: -1,
                    inningPitched: 2.25,
                    strikeoutPitcher: 2,
                    win: 4,
                    earnedRunAllowed: -2,
                },
            },
        })
        console.log(`  + Created ScoringRule "standard" v1 (${scoringRule.id})`)
    } else {
        console.log(`  = Reusing ScoringRule "standard" v1 (${scoringRule.id})`)
    }

    // 2) Seed tournaments on top of the League table.
    await seedTournaments(scoringRule.id)

    // 3) Seed AI feature catalog rows + give real users a starting balance
    // so they can actually invoke the features end-to-end.
    await seedAIFeatures()
    await seedStartingCredits()
}

async function seedAIFeatures(): Promise<void> {
    console.log('--- AI features ---')
    const features = [
        {
            key: 'lineup_optimizer',
            name: 'Lineup Optimizer',
            costCredits: 20,
            modelName:
                process.env.OPENAI_API_MODEL_COMPLEX_REASONING ?? 'gpt-5.4',
            description: 'AI-generated lineup suggestions for any contest',
        },
        {
            key: 'player_analysis',
            name: 'Player Analysis',
            costCredits: 10,
            modelName: process.env.OPENAI_API_MODEL_DEFAULT ?? 'gpt-5.3',
            description:
                'Deep dive on form, matchup, and fantasy outlook',
        },
        {
            key: 'trade_advisor',
            name: 'Trade Advisor',
            costCredits: 15,
            modelName:
                process.env.OPENAI_API_MODEL_COMPLEX_REASONING ?? 'gpt-5.4',
            description:
                'Evaluates proposed trades in season-long leagues',
        },
        {
            key: 'matchup_predictor',
            name: 'Matchup Predictor',
            costCredits: 5,
            modelName: process.env.OPENAI_API_MODEL_CHEAP ?? 'gpt-5.2',
            description: 'Quick game outcome and key-player prediction',
        },
        {
            key: 'team_builder_autofill',
            name: 'Team Builder Autofill',
            costCredits: 3,
            modelName: process.env.OPENAI_API_MODEL_CHEAP ?? 'gpt-5.2',
            description:
                'AI-suggested picks to fill the team-builder lineup',
        },
    ]
    for (const f of features) {
        // The AIFeature schema has no `name` or `description` field, so we
        // upsert only the columns it actually has — the extras stay in this
        // seed for documentation purposes.
        await prisma.aIFeature.upsert({
            where: { key: f.key },
            update: { costCredits: f.costCredits, modelName: f.modelName },
            create: {
                key: f.key,
                costCredits: f.costCredits,
                modelName: f.modelName,
            },
        })
    }
    console.log(`  + Upserted ${features.length} AIFeature rows`)
}

// Bootstraps a positive credit balance for every real (non-@seed.local) user
// so AI features are actually exercisable. Skips users who already have any
// CreditTransaction row — once the ledger is non-empty, the user is "real"
// and we don't want to keep injecting grants on every seed run.
const STARTING_BALANCE = 1420

async function seedStartingCredits(): Promise<void> {
    console.log('--- Starting credits ---')
    const realUsers = await prisma.user.findMany({
        where: { email: { not: { endsWith: '@seed.local' } } },
        select: { id: true, email: true },
    })
    let granted = 0
    for (const user of realUsers) {
        const existing = await prisma.creditTransaction.findFirst({
            where: { userId: user.id },
            select: { id: true },
        })
        if (existing) continue
        await prisma.creditTransaction.create({
            data: {
                userId: user.id,
                amount: STARTING_BALANCE,
                balanceAfter: STARTING_BALANCE,
                type: 'ADMIN_GRANT',
                status: 'COMPLETED',
                referenceType: 'seed:starting_balance',
            },
        })
        granted++
    }
    console.log(
        `  + Granted ${STARTING_BALANCE} credits to ${granted}/${realUsers.length} real user(s) (skipped any with existing ledger rows)`,
    )
}

// ---------------------------------------------------------------------------
// Tournaments seed
// ---------------------------------------------------------------------------
//
// We sit on top of the existing League/LeagueMember/FantasyTeam schema.
// To make the catalog feel populated, each PUBLIC tournament gets 8-15
// freshly seeded demo members:
//   - demo User (email *@seed.local, no passwordHash)
//   - demo FantasyTeam (linked to the league via leagueMemberId) with a
//     deterministic 9-player roster of real 2026 MLB players
//   - LeagueMember row joining the two
//
// Weekly scores are NOT persisted at seed time — the standings endpoint and
// the /me endpoints lazy-compute them at read time via the WeeklyScoringService
// and cache them in WeeklyScoreCache.

const DEMO_USER_EMAIL_SUFFIX = '@seed.local'

// ---------------------------------------------------------------------------
// Real-MLB roster pool for demo members
// ---------------------------------------------------------------------------
//
// Hand-picked active 2026 MLB players covering each roster slot. Each demo
// FantasyTeam draws a deterministic 9-player lineup from this pool (1 P, 1 C,
// 1 1B, 1 2B, 1 3B, 1 SS, 3 OF) so the real scoring engine has actual stat
// lines to score against. External IDs are MLB Stats API personId. Some IDs
// repeat across teams — that's intentional; in fantasy a pitcher like Skubal
// can headline multiple squads.

interface PoolPlayer {
    id: number
    name: string
    slot: PoolSlotKey
    team: string
}

type PoolSlotKey = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'OF'

const MLB_PLAYER_POOL: PoolPlayer[] = [
    // Pitchers
    { id: 660271, name: 'Shohei Ohtani', slot: 'P', team: 'Los Angeles Dodgers' },
    { id: 669373, name: 'Tarik Skubal', slot: 'P', team: 'Detroit Tigers' },
    { id: 554430, name: 'Zack Wheeler', slot: 'P', team: 'Philadelphia Phillies' },
    { id: 543037, name: 'Gerrit Cole', slot: 'P', team: 'New York Yankees' },
    { id: 669203, name: 'Corbin Burnes', slot: 'P', team: 'Arizona Diamondbacks' },
    { id: 675911, name: 'Spencer Strider', slot: 'P', team: 'Atlanta Braves' },
    { id: 607192, name: 'Tyler Glasnow', slot: 'P', team: 'Los Angeles Dodgers' },
    { id: 657277, name: 'Logan Webb', slot: 'P', team: 'San Francisco Giants' },

    // Catchers
    { id: 592663, name: 'J.T. Realmuto', slot: 'C', team: 'Philadelphia Phillies' },
    { id: 669257, name: 'Will Smith', slot: 'C', team: 'Los Angeles Dodgers' },
    { id: 595978, name: 'Adley Rutschman', slot: 'C', team: 'Baltimore Orioles' },
    { id: 663728, name: 'Salvador Perez', slot: 'C', team: 'Kansas City Royals' },

    // First base
    { id: 621566, name: 'Matt Olson', slot: '1B', team: 'Atlanta Braves' },
    { id: 518692, name: 'Freddie Freeman', slot: '1B', team: 'Los Angeles Dodgers' },
    { id: 624413, name: 'Pete Alonso', slot: '1B', team: 'New York Mets' },
    { id: 547180, name: 'Bryce Harper', slot: '1B', team: 'Philadelphia Phillies' },

    // Second base
    { id: 665487, name: 'Ozzie Albies', slot: '2B', team: 'Atlanta Braves' },
    { id: 671277, name: 'Jose Altuve', slot: '2B', team: 'Houston Astros' },
    { id: 663647, name: 'Marcus Semien', slot: '2B', team: 'Texas Rangers' },
    { id: 643217, name: 'Ketel Marte', slot: '2B', team: 'Arizona Diamondbacks' },

    // Third base
    { id: 608070, name: 'Jose Ramirez', slot: '3B', team: 'Cleveland Guardians' },
    { id: 646240, name: 'Rafael Devers', slot: '3B', team: 'Boston Red Sox' },
    { id: 593428, name: 'Manny Machado', slot: '3B', team: 'San Diego Padres' },
    { id: 665161, name: 'Austin Riley', slot: '3B', team: 'Atlanta Braves' },

    // Shortstops
    { id: 596019, name: 'Francisco Lindor', slot: 'SS', team: 'New York Mets' },
    { id: 677951, name: 'Bobby Witt Jr.', slot: 'SS', team: 'Kansas City Royals' },
    { id: 683002, name: 'Gunnar Henderson', slot: 'SS', team: 'Baltimore Orioles' },
    { id: 605141, name: 'Mookie Betts', slot: 'SS', team: 'Los Angeles Dodgers' },

    // Outfield
    { id: 592450, name: 'Aaron Judge', slot: 'OF', team: 'New York Yankees' },
    { id: 660670, name: 'Ronald Acuna Jr.', slot: 'OF', team: 'Atlanta Braves' },
    { id: 545361, name: 'Mike Trout', slot: 'OF', team: 'Los Angeles Angels' },
    { id: 665742, name: 'Juan Soto', slot: 'OF', team: 'New York Mets' },
    { id: 672275, name: 'Kyle Tucker', slot: 'OF', team: 'Chicago Cubs' },
    { id: 663586, name: 'Yordan Alvarez', slot: 'OF', team: 'Houston Astros' },
    { id: 670541, name: 'Corbin Carroll', slot: 'OF', team: 'Arizona Diamondbacks' },
    { id: 656941, name: 'Kyle Schwarber', slot: 'OF', team: 'Philadelphia Phillies' },
    { id: 656555, name: 'Cody Bellinger', slot: 'OF', team: 'New York Yankees' },
    { id: 660162, name: 'Adolis Garcia', slot: 'OF', team: 'Texas Rangers' },
]

// 9-slot roster layout — one entry per slot to fill in this exact order.
const FIELD_SLOTS: { key: PoolSlotKey; slotPosition: RosterSlotPosition }[] = [
    { key: 'P', slotPosition: RosterSlotPosition.P },
    { key: 'C', slotPosition: RosterSlotPosition.C },
    { key: '1B', slotPosition: RosterSlotPosition.FIRST_BASE },
    { key: '2B', slotPosition: RosterSlotPosition.SECOND_BASE },
    { key: '3B', slotPosition: RosterSlotPosition.THIRD_BASE },
    { key: 'SS', slotPosition: RosterSlotPosition.SS },
    { key: 'OF', slotPosition: RosterSlotPosition.OF },
    { key: 'OF', slotPosition: RosterSlotPosition.OF },
    { key: 'OF', slotPosition: RosterSlotPosition.OF },
]

const POOL_SLOT_TO_PLAYER_POSITION: Record<PoolSlotKey, PlayerPosition> = {
    P: PlayerPosition.P,
    C: PlayerPosition.C,
    '1B': PlayerPosition.FIRST_BASE,
    '2B': PlayerPosition.SECOND_BASE,
    '3B': PlayerPosition.THIRD_BASE,
    SS: PlayerPosition.SS,
    OF: PlayerPosition.OF,
}

// FNV-1a string hash. Deterministic 32-bit unsigned int per input. Used to
// seed a stable per-team starting offset into each position's pool so reruns
// produce identical rosters.
function hashStringToInt(value: string): number {
    let hash = 2166136261
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i)
        hash = Math.imul(hash, 16777619) >>> 0
    }
    return hash >>> 0
}

interface SeedRosterPick {
    externalPlayerId: number
    playerName: string
    playerPosition: PlayerPosition
    playerTeamName: string
    slotPosition: RosterSlotPosition
    salaryAtLock: number
}

// Build a 9-slot roster for a demo team. Walks FIELD_SLOTS in order, picking
// from the appropriate position pool with a hash-driven rotation so each team
// gets a different but stable lineup. Captain is the first picked player.
function buildDemoRoster(seedKey: string): {
    rosterSlots: SeedRosterPick[]
    captainExternalPlayerId: number
} {
    const seed = hashStringToInt(seedKey)
    const usedIds = new Set<number>()
    const rosterSlots: SeedRosterPick[] = []
    let captainExternalPlayerId = 0

    for (let slotIndex = 0; slotIndex < FIELD_SLOTS.length; slotIndex += 1) {
        const slot = FIELD_SLOTS[slotIndex]
        const candidates = MLB_PLAYER_POOL.filter((p) => p.slot === slot.key)

        // Hash + slot index gives a stable but slot-varying offset, so we
        // don't always pick the same N=index'th candidate for every team.
        const offset = (seed + slotIndex * 7) % candidates.length

        // Walk the rotated list; prefer the first non-duplicate, otherwise
        // accept a duplicate (we have enough overlap-tolerant slots). We
        // never want to fail to fill a slot.
        let picked: PoolPlayer = candidates[offset]
        for (let i = 0; i < candidates.length; i += 1) {
            const c = candidates[(offset + i) % candidates.length]
            if (!usedIds.has(c.id)) {
                picked = c
                break
            }
        }
        usedIds.add(picked.id)

        // Salary varies in 3000..10000 range, deterministic per player.
        const salaryAtLock = 3000 + (picked.id % 8) * 1000

        if (slotIndex === 0) captainExternalPlayerId = picked.id

        rosterSlots.push({
            externalPlayerId: picked.id,
            playerName: picked.name,
            playerPosition: POOL_SLOT_TO_PLAYER_POSITION[picked.slot],
            playerTeamName: picked.team,
            slotPosition: slot.slotPosition,
            salaryAtLock,
        })
    }

    return { rosterSlots, captainExternalPlayerId }
}

interface SeedTournament {
    slug: string
    name: string
    leagueSlug: string
    visibility: LeagueVisibility
    status: LeagueStatus
    // Offsets in DAYS — startsAt is now + startsInDays * DAY.
    startsInDays: number
    totalWeeks: number
    entryFeeCredits: number
    prizePoolCredits: number
    memberCount: number
}

const SEED_TOURNAMENTS: SeedTournament[] = [
    {
        slug: 'mlb-summer-classic',
        name: 'MLB Summer Classic',
        leagueSlug: 'mlb',
        visibility: LeagueVisibility.PUBLIC,
        status: LeagueStatus.IN_SEASON,
        // Started 3 weeks ago, 12 weeks long → currentWeek = 4.
        startsInDays: -21,
        totalWeeks: 12,
        entryFeeCredits: 50,
        prizePoolCredits: 12000,
        memberCount: 15,
    },
    {
        slug: 'mlb-rookie-cup',
        name: 'MLB Rookie Cup',
        leagueSlug: 'mlb',
        visibility: LeagueVisibility.PUBLIC,
        status: LeagueStatus.DRAFTING,
        // Hasn't started yet — joinable. Drafts open this week.
        startsInDays: 5,
        totalWeeks: 8,
        entryFeeCredits: 25,
        prizePoolCredits: 4500,
        memberCount: 8,
    },
    {
        slug: 'mlb-fall-flagship',
        name: 'MLB Fall Flagship',
        leagueSlug: 'mlb',
        visibility: LeagueVisibility.PUBLIC,
        status: LeagueStatus.DRAFTING,
        startsInDays: 14,
        totalWeeks: 10,
        entryFeeCredits: 100,
        prizePoolCredits: 25000,
        memberCount: 12,
    },
    {
        slug: 'mlb-2025-spring',
        name: 'MLB 2025 Spring Title',
        leagueSlug: 'mlb',
        visibility: LeagueVisibility.PUBLIC,
        status: LeagueStatus.COMPLETED,
        // Finished — startsAt is in the past, endsAt is also in the past.
        startsInDays: -98,
        totalWeeks: 12,
        entryFeeCredits: 75,
        prizePoolCredits: 18000,
        memberCount: 14,
    },
    {
        slug: 'milb-prospects-league',
        name: 'MiLB Prospects League',
        leagueSlug: 'milb',
        visibility: LeagueVisibility.PUBLIC,
        status: LeagueStatus.IN_SEASON,
        startsInDays: -7,
        totalWeeks: 6,
        entryFeeCredits: 10,
        prizePoolCredits: 1500,
        memberCount: 10,
    },
    {
        slug: 'npb-summer-showdown',
        name: 'NPB Summer Showdown',
        leagueSlug: 'npb',
        visibility: LeagueVisibility.PUBLIC,
        status: LeagueStatus.DRAFTING,
        startsInDays: 10,
        totalWeeks: 8,
        entryFeeCredits: 30,
        prizePoolCredits: 5000,
        memberCount: 9,
    },
]

async function seedTournaments(scoringRuleId: string): Promise<void> {
    console.log('--- Tournaments ---')

    // Idempotency, in this order:
    //   1) Drop the seed tournaments by their well-known inviteCodes.
    //      LeagueMember cascades from League → memberships go with it.
    //   2) Drop demo users by *@seed.local. Their FantasyTeams cascade
    //      with User. League has NO cascade from User, so we MUST drop
    //      the tournaments first or the user deletion will fail on FK
    //      (commissionerId references the seed commissioner).
    const seedInviteCodes = SEED_TOURNAMENTS.map((t) => `SEED-${t.slug}`)
    const toursDeleted = await prisma.league.deleteMany({
        where: { inviteCode: { in: seedInviteCodes } },
    })
    if (toursDeleted.count > 0) {
        console.log(`  - Removed ${toursDeleted.count} existing demo tournament(s)`)
    }

    const demoUsersToWipe = await prisma.user.findMany({
        where: { email: { endsWith: DEMO_USER_EMAIL_SUFFIX } },
        select: { id: true },
    })
    if (demoUsersToWipe.length > 0) {
        const ids = demoUsersToWipe.map((u) => u.id)
        const fts = await prisma.fantasyTeam.deleteMany({
            where: { userId: { in: ids } },
        })
        const us = await prisma.user.deleteMany({
            where: { id: { in: ids } },
        })
        console.log(`  - Wiped ${us.count} demo user(s) and ${fts.count} demo team(s)`)
    }

    // Find a commissioner. Prefer a real seeded admin user; if none exists
    // we fall back to creating a dedicated demo commissioner.
    const commissioner = await ensureCommissioner()

    let demoUserCounter = 0
    let totalMembers = 0
    let totalRosterSlots = 0
    let totalWeeklyLineups = 0

    for (const t of SEED_TOURNAMENTS) {
        const startsAt = new Date(now + t.startsInDays * DAY)
        const endsAt = new Date(startsAt.getTime() + t.totalWeeks * WEEK)

        const league = await prisma.league.create({
            data: {
                commissionerId: commissioner.id,
                scoringRuleId,
                inviteCode: `SEED-${t.slug}`,
                externalSeasonId: 2026,
                status: t.status,
                draftType: DraftType.SNAKE,
                name: t.name,
                leagueSlug: t.leagueSlug,
                visibility: t.visibility,
                startsAt,
                endsAt,
                totalWeeks: t.totalWeeks,
                entryFeeCredits: t.entryFeeCredits,
                prizePoolCredits: t.prizePoolCredits,
            },
        })

        // Derive how many WeeklyLineup rows to backfill per member. DRAFTING
        // tournaments → 0 (no past weeks); IN_SEASON / PLAYOFFS → up to
        // currentWeek; COMPLETED / ARCHIVED → all totalWeeks. Each weekly row
        // copies the demo roster, since seed-time is the only roster history
        // we have.
        const seedCurrentWeek = computeTournamentCurrentWeek({
            status: t.status,
            startsAt,
            totalWeeks: t.totalWeeks,
            now: new Date(now),
        })

        // Create demo members.
        for (let i = 0; i < t.memberCount; i += 1) {
            demoUserCounter += 1
            const slug = `${t.slug}-${i + 1}`
            const userEmail = `demo-${slug}${DEMO_USER_EMAIL_SUFFIX}`
            const userName = `Demo Player ${demoUserCounter}`
            const teamName = `Demo Squad ${demoUserCounter}`

            const user = await prisma.user.create({
                data: {
                    email: userEmail,
                    name: userName,
                    emailVerified: false,
                    passwordHash: null,
                    provider: 'seed',
                },
            })

            // Roster is deterministic per (tournament, demo slot) so reruns
            // produce identical lineups even if user IDs shuffle.
            const { rosterSlots, captainExternalPlayerId } = buildDemoRoster(
                `${t.slug}:${i + 1}`,
            )

            const team = await prisma.fantasyTeam.create({
                data: {
                    userId: user.id,
                    name: teamName,
                    leagueSlug: t.leagueSlug,
                    format: 'season_long',
                    captainExternalPlayerId,
                    rosterSlots: {
                        create: rosterSlots,
                    },
                },
            })

            const member = await prisma.leagueMember.create({
                data: {
                    leagueId: league.id,
                    userId: user.id,
                },
            })

            // Link the FantasyTeam to its LeagueMember (1:1).
            await prisma.fantasyTeam.update({
                where: { id: team.id },
                data: { leagueMemberId: member.id },
            })

            // Backfill WeeklyLineup snapshots for every past week so the
            // scoring engine sees real frozen lineups (instead of "not joined
            // yet" 0-point placeholders). Each weekly row is a copy of the
            // demo roster — we don't model edit history at seed time.
            for (let week = 1; week <= seedCurrentWeek; week += 1) {
                const lockedAt = tournamentWeekRange(startsAt, week).startUtc
                await prisma.weeklyLineup.create({
                    data: {
                        leagueMemberId: member.id,
                        week,
                        captainExternalPlayerId,
                        lockedAt,
                        slots: {
                            create: rosterSlots.map((slot) => ({
                                externalPlayerId: slot.externalPlayerId,
                                playerName: slot.playerName,
                                playerPosition: slot.playerPosition,
                                playerTeamName: slot.playerTeamName,
                                slotPosition: slot.slotPosition,
                                salaryAtLock: slot.salaryAtLock,
                            })),
                        },
                    },
                })
                totalWeeklyLineups += 1
            }

            totalMembers += 1
            totalRosterSlots += rosterSlots.length
        }

        console.log(
            `  + ${t.leagueSlug.padEnd(5)} ${t.name.padEnd(28)} ${t.status.padEnd(10)} ${t.memberCount} members (${seedCurrentWeek} weeks/member)`,
        )
    }

    console.log(
        `Tournaments seed complete — ${SEED_TOURNAMENTS.length} tournament(s), ${totalMembers} demo member(s), ${totalRosterSlots} roster slot(s), ${totalWeeklyLineups} weekly lineup(s).`,
    )
}

async function ensureCommissioner() {
    // Reuse an existing real user as commissioner (any non-demo user works).
    // Falls back to a dedicated seed-commissioner if no real users exist yet.
    const real = await prisma.user.findFirst({
        where: { email: { not: { endsWith: DEMO_USER_EMAIL_SUFFIX } } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, email: true },
    })
    if (real) {
        console.log(`  = Using ${real.email} as commissioner`)
        return real
    }

    const seedCommissionerEmail = `seed-commissioner${DEMO_USER_EMAIL_SUFFIX}`
    let commissioner = await prisma.user.findUnique({
        where: { email: seedCommissionerEmail },
        select: { id: true, email: true },
    })
    if (!commissioner) {
        commissioner = await prisma.user.create({
            data: {
                email: seedCommissionerEmail,
                name: 'Seed Commissioner',
                emailVerified: false,
                passwordHash: null,
                provider: 'seed',
            },
            select: { id: true, email: true },
        })
        console.log(`  + Created seed commissioner ${seedCommissionerEmail}`)
    }
    return commissioner
}

main()
    .catch((error) => {
        console.error('Seed failed:', error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

// Silence unused warning for HOUR (kept for readability when tweaking offsets).
void HOUR
