import 'dotenv/config'

import { randomUUID } from 'node:crypto'

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import {
    CreditTransactionStatus,
    CreditTransactionType,
    DraftType,
    LeagueStatus,
    LeagueVisibility,
    PlayerPosition,
    RosterSlotPosition,
} from '../src/generated/prisma/enums'
import { computeTournamentCurrentWeek } from '../server/services/tournaments/tournament-week.util'
import { tournamentWeekRange } from '../server/services/tournaments/tournament-week-range.util'
import { MlbSportsProvider } from '../server/providers/mlb/mlb.provider'
import { CreditRepository } from '../server/repositories/credit/credit.repository'
import { LeagueRepository } from '../server/repositories/league/league.repository'
import { ScoringRuleRepository } from '../server/repositories/scoring-rule/scoring-rule.repository'
import { TournamentsRepository } from '../server/repositories/tournaments/tournaments.repository'
import { WeeklyLineupRepository } from '../server/repositories/weekly-lineup/weekly-lineup.repository'
import { WeeklyScoreCacheRepository } from '../server/repositories/weekly-score-cache/weekly-score-cache.repository'
import { WeeklyScoringService } from '../server/services/scoring/weekly-scoring.service'
import { TournamentSettlementService } from '../server/services/tournaments/settlement/tournament-settlement.service'
import {
    ENTRY_FEE_REFERENCE_TYPE,
    WEEK_PAYOUT_REFERENCE_TYPE,
} from '../server/services/tournaments/settlement/settlement.const'
import type { SupportedBaseballLeague } from '../src/shared/baseball'

// The MLB provider relies on Next's fetch cache in the app runtime; there is
// none here (jiti). Without it, scoring 200-member tournaments would re-fetch
// the same schedules and box scores tens of thousands of times. Memoise GET
// responses by URL for the life of the seed process.
{
    const realFetch = globalThis.fetch
    const inflight = new Map<string, Promise<Response>>()
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
        const method = (init?.method ?? 'GET').toUpperCase()
        const url =
            typeof input === 'string'
                ? input
                : input instanceof URL
                  ? input.toString()
                  : input.url
        if (method !== 'GET') return realFetch(input, init)
        let cached = inflight.get(url)
        if (!cached) {
            cached = realFetch(input, init)
            inflight.set(url, cached)
        }
        return cached.then((r) => r.clone())
    }) as typeof fetch
}

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

    // 2) AI feature catalog. Real-user starting credits are granted inside
    // seedTournaments() (before entry fees are charged).
    await seedAIFeatures()

    // 3) Seed tournaments — enrollments, entry-fee debits, and (for short
    // active tournaments) scoring + weekly prize settlement.
    await seedTournaments(scoringRule.id)

    // NOTE: weekly scores for long/completed tournaments are still NOT computed
    // here (too slow without the app's fetch cache). The seed stays
    // pure DB writes (fast + reliable over a remote database). To populate
    // standings with real points immediately after seeding, hit the scoring
    // cron once — it runs in the app runtime (with provider fetch caching) and
    // warms every active tournament in seconds:
    //   curl -H "Authorization: Bearer $CRON_SECRET" \
    //     http://localhost:3000/api/internal/cron/refresh-scoring
    // Otherwise standings lazy-compute (and cache) on first view.
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

// Each seeded competitor gets this on creation so their entry-fee debit (and
// any winnings) land on a real balance.
const SEED_USER_STARTING_BALANCE = 1500

// Bulk demo users (seed-users.ts) enrolled as extra competitors per tournament,
// so rosters look full. Their starting balance is set by seed-users.ts
// (STARTING_BALANCE there) — keep in sync.
const DEMO_MEMBERS_PER_TOURNAMENT = 200
const DEMO_USER_STARTING_BALANCE = 1000

// Recompute the running `balanceAfter` for one user's whole ledger in
// createdAt order — used after deleting seed money rows so the surviving
// entries stay consistent.
async function rebuildLedgerBalances(userId: string): Promise<void> {
    const rows = await prisma.creditTransaction.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true, amount: true },
    })
    let running = 0
    for (const row of rows) {
        running += row.amount
        await prisma.creditTransaction.update({
            where: { id: row.id },
            data: { balanceAfter: running },
        })
    }
}

async function grantRealUserStartingCredits(): Promise<void> {
    console.log('--- Starting credits ---')
    // Exclude both seeded competitors and bulk demo users (seed-users.ts) —
    // the latter would turn this into 20k per-user round-trips.
    const realUsers = await prisma.user.findMany({
        where: {
            email: { not: { endsWith: '@seed.local' } },
            provider: { not: 'demo' },
        },
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
// seeded competitors with realistic manager + team names:
//   - User (realistic name, email *@seed.local, no passwordHash)
//   - FantasyTeam (linked to the league via leagueMemberId) with a
//     deterministic 9-player roster of real 2026 MLB players
//   - LeagueMember row joining the two
//   - WeeklyLineup snapshots for every past week, so scoring has real data
//
// The real account (the first non-@seed.local user, also the commissioner) is
// additionally enrolled as a competitor in each active (non-completed)
// tournament, so "my tournaments" reflects the correct leagues with opponents.
//
// MLB tournaments draw from the hand-picked MLB_PLAYER_POOL below. MiLB
// tournaments (Triple-A … Single-A) draw from pools fetched from the same MLB
// Stats API provider at seed time — see seedMiLBTournaments().

const SEED_USER_EMAIL_SUFFIX = '@seed.local'

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
// `pool` defaults to the hand-picked MLB pool; MiLB seeding passes a pool
// built from real rosters fetched from the provider.
function buildDemoRoster(
    seedKey: string,
    pool: PoolPlayer[] = MLB_PLAYER_POOL,
): {
    rosterSlots: SeedRosterPick[]
    captainExternalPlayerId: number
} {
    const seed = hashStringToInt(seedKey)
    const usedIds = new Set<number>()
    const rosterSlots: SeedRosterPick[] = []
    let captainExternalPlayerId = 0

    for (let slotIndex = 0; slotIndex < FIELD_SLOTS.length; slotIndex += 1) {
        const slot = FIELD_SLOTS[slotIndex]
        const candidates = pool.filter((p) => p.slot === slot.key)

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

// ---------------------------------------------------------------------------
// Realistic seeded identities
// ---------------------------------------------------------------------------
//
// Seeded competitors get plausible human manager names and fantasy team names
// (no "Demo"/"Player N" labels). Names are chosen deterministically from these
// pools by a running counter so reruns are stable; the e-mail still carries the
// @seed.local suffix the cleanup + credit-grant logic keys off.

const SEEDED_FIRST_NAMES = [
    'James', 'Marcus', 'David', 'Daniel', 'Carlos', 'Tyler', 'Brandon', 'Jordan',
    'Ethan', 'Lucas', 'Mason', 'Logan', 'Diego', 'Victor', 'Isaac', 'Noah',
    'Owen', 'Caleb', 'Hunter', 'Cole', 'Trevor', 'Aaron', 'Kevin', 'Sean',
    'Patrick', 'Ryan', 'Andre', 'Nathan', 'Miguel', 'Tobias',
]

const SEEDED_LAST_NAMES = [
    'Mitchell', 'Carter', 'Bennett', 'Sullivan', 'Brooks', 'Reyes', 'Foster',
    'Hayes', 'Coleman', 'Parker', 'Morgan', 'Russell', 'Griffin', 'Hudson',
    'Porter', 'Spencer', 'Wallace', 'Bryant', 'Fleming', 'Hoffman', 'Ramsey',
    'Delgado', 'Knight', 'Vaughn', 'Maddox', 'Sutton', 'Barrett', 'Crawford',
    'Donovan', 'Mercer',
]

const SEEDED_TEAM_NAMES = [
    'Bronx Bombers', 'Diamond Kings', 'Grand Slammers', 'Bases Loaded',
    'Dinger Dynasty', 'Pinch Hitters', 'Triple Threat', 'Wild Pitches',
    'Strike Zone', 'Power Alley', 'Bullpen Bandits', 'Home Run Heroes',
    'Extra Innings', 'The Closers', 'Rally Caps', 'Cleanup Crew',
    'Backdoor Sliders', 'Web Gems', 'Walk-Off Warriors', 'Moonshot Mavericks',
    'Fastball Fanatics', 'Switch Hitters', 'Golden Gloves', 'Seventh Inning',
    'Chin Music', 'Can of Corn', 'Frozen Ropes', 'Sandlot Saints',
    'Curveball Crew', 'Outfield Outlaws', 'Designated Hitters', 'Foul Poles',
    'Rosin Bags', 'Squeeze Play', 'Hot Corner Heroes', 'Leadoff Legends',
]

// Distinct team names for the real user's own entries across tournaments.
const REAL_USER_TEAM_NAMES = ['Skyline Sluggers', 'Summit Stars', 'Capital Crushers']

function seededManagerName(n: number): string {
    const first = SEEDED_FIRST_NAMES[(n * 3) % SEEDED_FIRST_NAMES.length]
    const last = SEEDED_LAST_NAMES[(n * 5) % SEEDED_LAST_NAMES.length]
    return `${first} ${last}`
}

function seededTeamName(n: number): string {
    return SEEDED_TEAM_NAMES[(n * 7) % SEEDED_TEAM_NAMES.length]
}

function seededEmail(managerName: string, n: number): string {
    const local = managerName.toLowerCase().replace(/[^a-z]+/g, '.')
    return `${local}.${n}${SEED_USER_EMAIL_SUFFIX}`
}

// One competitor to enroll in a tournament: an existing userId plus the
// display bits. `enrollMembersBulk` turns a list of these into flat row
// arrays and writes them with a handful of `createMany` calls instead of
// ~(4 + weeks) serial round-trips per member.
interface MemberEnrollment {
    userId: string
    teamName: string
    seedKey: string
}

interface BulkEnrollResult {
    members: number
    rosterSlots: number
    weeklyLineups: number
    entryFeesCharged: number
    commissionerBalanceAfter: number
}

// Postgres caps a statement at 65535 bind parameters. With 200 demo members ×
// 12 weeks × 9 slots a single createMany would blow past that, so split.
const CREATE_MANY_CHUNK = 4000

async function createManyChunked<T>(
    model: { createMany(args: { data: T[] }): Promise<{ count: number }> },
    rows: T[],
): Promise<void> {
    for (let i = 0; i < rows.length; i += CREATE_MANY_CHUNK) {
        await model.createMany({ data: rows.slice(i, i + CREATE_MANY_CHUNK) })
    }
}

async function enrollMembersBulk(params: {
    leagueId: string
    leagueSlug: string
    startsAt: Date
    upToWeek: number
    enrollments: MemberEnrollment[]
    pool?: PoolPlayer[]
    entryFeeCredits: number
    commissionerId: string
    commissionerBalanceBefore: number
    // userIds that are bulk demo users — they already have a balance
    // (DEMO_USER_STARTING_BALANCE), so no starting grant, just the fee.
    demoUserIds?: Set<string>
}): Promise<BulkEnrollResult> {
    const {
        leagueId,
        leagueSlug,
        startsAt,
        upToWeek,
        enrollments,
        pool,
        entryFeeCredits,
        commissionerId,
        commissionerBalanceBefore,
    } = params
    const demoUserIds = params.demoUserIds ?? new Set<string>()
    if (enrollments.length === 0) {
        return {
            members: 0,
            rosterSlots: 0,
            weeklyLineups: 0,
            entryFeesCharged: 0,
            commissionerBalanceAfter: commissionerBalanceBefore,
        }
    }

    // Pre-compute every week's lock timestamp once (shared across members).
    const lockedAtByWeek: Date[] = []
    for (let week = 1; week <= upToWeek; week += 1) {
        lockedAtByWeek[week] = tournamentWeekRange(startsAt, week).startUtc
    }

    const leagueMemberRows: {
        id: string
        leagueId: string
        userId: string
    }[] = []
    const fantasyTeamRows: {
        id: string
        userId: string
        leagueMemberId: string
        name: string
        leagueSlug: string
        format: string
        captainExternalPlayerId: number
    }[] = []
    const rosterSlotRows: (SeedRosterPick & { fantasyTeamId: string })[] = []
    const weeklyLineupRows: {
        id: string
        leagueMemberId: string
        week: number
        captainExternalPlayerId: number
        lockedAt: Date
    }[] = []
    const weeklyLineupSlotRows: (SeedRosterPick & { weeklyLineupId: string })[] = []
    const enrolled: { memberId: string; userId: string }[] = []

    for (const enrollment of enrollments) {
        const memberId = randomUUID()
        const teamId = randomUUID()
        enrolled.push({ memberId, userId: enrollment.userId })
        const { rosterSlots, captainExternalPlayerId } = buildDemoRoster(
            enrollment.seedKey,
            pool,
        )

        leagueMemberRows.push({ id: memberId, leagueId, userId: enrollment.userId })
        fantasyTeamRows.push({
            id: teamId,
            userId: enrollment.userId,
            leagueMemberId: memberId,
            name: enrollment.teamName,
            leagueSlug,
            format: 'season_long',
            captainExternalPlayerId,
        })
        for (const slot of rosterSlots) {
            rosterSlotRows.push({ ...slot, fantasyTeamId: teamId })
        }
        for (let week = 1; week <= upToWeek; week += 1) {
            const lineupId = randomUUID()
            weeklyLineupRows.push({
                id: lineupId,
                leagueMemberId: memberId,
                week,
                captainExternalPlayerId,
                lockedAt: lockedAtByWeek[week],
            })
            for (const slot of rosterSlots) {
                weeklyLineupSlotRows.push({ ...slot, weeklyLineupId: lineupId })
            }
        }
    }

    // Sequential bulk inserts, chunked to stay under Postgres' bind-parameter
    // cap. FK order matters: members → teams → slots, lineups → lineup slots.
    await createManyChunked(prisma.leagueMember, leagueMemberRows)
    await createManyChunked(prisma.fantasyTeam, fantasyTeamRows)
    await createManyChunked(
        prisma.rosterSlot,
        rosterSlotRows.map((r) => ({
            fantasyTeamId: r.fantasyTeamId,
            externalPlayerId: r.externalPlayerId,
            playerName: r.playerName,
            playerPosition: r.playerPosition,
            playerTeamName: r.playerTeamName,
            slotPosition: r.slotPosition,
            salaryAtLock: r.salaryAtLock,
        })),
    )
    if (weeklyLineupRows.length > 0) {
        await createManyChunked(prisma.weeklyLineup, weeklyLineupRows)
        await createManyChunked(
            prisma.weeklyLineupSlot,
            weeklyLineupSlotRows.map((r) => ({
                weeklyLineupId: r.weeklyLineupId,
                externalPlayerId: r.externalPlayerId,
                playerName: r.playerName,
                playerPosition: r.playerPosition,
                playerTeamName: r.playerTeamName,
                slotPosition: r.slotPosition,
                salaryAtLock: r.salaryAtLock,
            })),
        )
    }

    // Money: a starting grant for each new seed user, then an entry-fee debit
    // for every enrollment. `balanceAfter` is computed here (grants land first,
    // then fees) so the ledger's running total stays correct without a rebuild.
    const grantRows: {
        userId: string
        amount: number
        balanceAfter: number
        type: CreditTransactionType
        status: CreditTransactionStatus
        referenceType: string
    }[] = []
    const feeRows: {
        userId: string
        amount: number
        balanceAfter: number
        type: CreditTransactionType
        status: CreditTransactionStatus
        referenceType: string
        referenceId: string
    }[] = []

    let commissionerBalance = commissionerBalanceBefore
    let entryFeesCharged = 0

    for (const { memberId, userId } of enrolled) {
        const isCommissioner = userId === commissionerId
        const isDemo = demoUserIds.has(userId)

        let balance: number
        if (isCommissioner) {
            balance = commissionerBalance
        } else if (isDemo) {
            // Already funded by seed-users.ts — no grant, enrolled exactly once.
            balance = DEMO_USER_STARTING_BALANCE
        } else {
            grantRows.push({
                userId,
                amount: SEED_USER_STARTING_BALANCE,
                balanceAfter: SEED_USER_STARTING_BALANCE,
                type: CreditTransactionType.ADMIN_GRANT,
                status: CreditTransactionStatus.COMPLETED,
                referenceType: 'seed:starting_balance',
            })
            balance = SEED_USER_STARTING_BALANCE
        }

        if (entryFeeCredits > 0) {
            balance -= entryFeeCredits
            feeRows.push({
                userId,
                amount: -entryFeeCredits,
                balanceAfter: balance,
                type: CreditTransactionType.TOURNAMENT_ENTRY_FEE,
                status: CreditTransactionStatus.COMPLETED,
                referenceType: ENTRY_FEE_REFERENCE_TYPE,
                referenceId: memberId,
            })
            entryFeesCharged += 1
            if (isCommissioner) commissionerBalance = balance
        }
    }

    await createManyChunked(prisma.creditTransaction, grantRows)
    await createManyChunked(prisma.creditTransaction, feeRows)

    return {
        members: leagueMemberRows.length,
        rosterSlots: rosterSlotRows.length,
        weeklyLineups: weeklyLineupRows.length,
        entryFeesCharged,
        commissionerBalanceAfter: commissionerBalance,
    }
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
    // MiLB tournaments (Triple-A / Double-A / High-A / Single-A) are seeded
    // separately in seedMiLBTournaments() because their player pools are
    // fetched from the provider at seed time. NPB / KBO / LVBP / LMB stay
    // "coming soon" — no data provider behind them yet.
]

async function seedTournaments(scoringRuleId: string): Promise<void> {
    console.log('--- Tournaments ---')

    // Idempotency, in this order:
    //   1) Drop EVERY previously-seeded tournament (inviteCode prefix-matched),
    //      not just the ones still listed below — so tournaments we've since
    //      removed (the data-less MiLB/NPB ones) are cleaned up too. League
    //      cascades take their LeagueMembers, and each member's FantasyTeam
    //      (including a real user's team that had joined a removed tournament).
    //   2) Drop seeded users by *@seed.local. Their FantasyTeams cascade
    //      with User. League has NO cascade from User, so we MUST drop
    //      the tournaments first or the user deletion will fail on FK
    //      (commissionerId references the seed commissioner).
    const toursDeleted = await prisma.league.deleteMany({
        where: { inviteCode: { startsWith: 'SEED-' } },
    })
    if (toursDeleted.count > 0) {
        console.log(`  - Removed ${toursDeleted.count} existing seeded tournament(s)`)
    }

    const seededUsersToWipe = await prisma.user.findMany({
        where: { email: { endsWith: SEED_USER_EMAIL_SUFFIX } },
        select: { id: true },
    })
    if (seededUsersToWipe.length > 0) {
        const ids = seededUsersToWipe.map((u) => u.id)
        const fts = await prisma.fantasyTeam.deleteMany({
            where: { userId: { in: ids } },
        })
        // Seed users' whole ledger goes with them — CreditTransaction has no
        // cascade from User, so this must precede the user delete or the FK
        // blocks it.
        await prisma.creditTransaction.deleteMany({ where: { userId: { in: ids } } })
        const us = await prisma.user.deleteMany({
            where: { id: { in: ids } },
        })
        console.log(`  - Wiped ${us.count} seeded user(s) and ${fts.count} seeded team(s)`)
    }

    // Drop real users' seed-created money rows (entry fees + weekly payouts)
    // so a re-seed rebuilds them from scratch rather than stacking, then
    // recompute their ledger's running balance so surviving rows stay correct.
    const finWipe = await prisma.creditTransaction.deleteMany({
        where: {
            referenceType: { in: [ENTRY_FEE_REFERENCE_TYPE, WEEK_PAYOUT_REFERENCE_TYPE] },
        },
    })
    if (finWipe.count > 0) {
        console.log(`  - Cleared ${finWipe.count} prior entry-fee / payout ledger row(s)`)
        const realUsers = await prisma.user.findMany({
            where: {
                email: { not: { endsWith: SEED_USER_EMAIL_SUFFIX } },
                provider: { not: 'demo' },
            },
            select: { id: true },
        })
        for (const u of realUsers) await rebuildLedgerBalances(u.id)
    }

    // Find a commissioner. Prefer the first real user; fall back to a
    // dedicated seed commissioner when no real users exist yet. When the
    // commissioner is a real account we also enroll them as a competitor in
    // the active tournaments below.
    const commissioner = await ensureCommissioner()
    const realCommissioner = !commissioner.email.endsWith(SEED_USER_EMAIL_SUFFIX)

    // Real users need a positive balance before entry fees are charged.
    await grantRealUserStartingCredits()
    const commissionerBalance = realCommissioner
        ? await new CreditRepository().getBalance(commissioner.id)
        : 0

    // Pool of bulk demo users (seed-users.ts) to hand out as extra competitors.
    const demoUserIds = (
        await prisma.user.findMany({
            where: { provider: 'demo' },
            select: { id: true },
            orderBy: { createdAt: 'asc' },
        })
    ).map((u) => u.id)
    if (demoUserIds.length > 0) {
        console.log(`  = ${demoUserIds.length} demo user(s) available for enrollment`)
    }

    const counters: SeedCounters = {
        seededUserCounter: 0,
        totalMembers: 0,
        totalRosterSlots: 0,
        totalWeeklyLineups: 0,
        realEnrollments: 0,
        tournaments: 0,
        entryFeesCharged: 0,
        commissionerBalance,
        weeksSettled: 0,
        payouts: 0,
        creditsPaid: 0,
        demoUserIds,
        demoCursor: 0,
    }

    // MLB tournaments — hand-picked player pool, no provider round-trips.
    for (const t of SEED_TOURNAMENTS) {
        await seedOneTournament({ t, scoringRuleId, commissioner, realCommissioner, counters })
    }

    // MiLB pools are built from real rosters fetched from the MLB Stats API
    // (same provider, different sportId per level). Fetched ONCE and shared by
    // both the hand-tuned MiLB tournaments and the generated catalogue.
    // Isolated in try/catch: a provider hiccup must not roll back the MLB seed.
    let milbPools: MiLBPools = new Map()
    try {
        milbPools = await fetchMiLBPools(new MlbSportsProvider())
    } catch (error) {
        console.warn(
            `  ! MiLB pool fetch skipped: ${error instanceof Error ? error.message : String(error)}`,
        )
    }

    // Hand-tuned MiLB tournaments (Triple-A Championship, etc.)
    await seedTournamentList({
        tournaments: MILB_SEED_TOURNAMENTS,
        pools: milbPools,
        scoringRuleId,
        commissioner,
        realCommissioner,
        counters,
    })

    // Generated catalogue — ~30 tournaments across all six backed leagues.
    // The real account is NOT auto-enrolled in these.
    await seedTournamentList({
        tournaments: buildGeneratedTournaments(),
        pools: milbPools,
        scoringRuleId,
        commissioner,
        realCommissioner,
        counters,
        enrollReal: false,
    })

    console.log(
        `Tournaments seed complete — ${counters.tournaments} tournament(s), ${counters.totalMembers} member(s) (${counters.demoCursor} demo), ${counters.realEnrollments} real enrollment(s), ${counters.totalRosterSlots} roster slot(s), ${counters.totalWeeklyLineups} weekly lineup(s), ${counters.entryFeesCharged} entry fee(s) charged.`,
    )

    // Score + settle the short active tournaments so weekly prize payouts show
    // up in the ledger. Long / completed tournaments are skipped (too slow
    // without the app's fetch cache) — run the settle-tournaments cron for
    // those.
    await seedScoreAndSettle(counters)
    console.log(
        `Settlement seed complete — ${counters.weeksSettled} week(s) settled, ${counters.payouts} payout(s), ${counters.creditsPaid} credits paid.`,
    )
}

// Only score + settle tournaments whose scored span is this short — the fast
// team-scoped path. Longer ones need the app runtime's fetch cache.
const SEED_SETTLE_MAX_SPAN_WEEKS = 6

async function seedScoreAndSettle(counters: SeedCounters): Promise<void> {
    console.log('--- Scoring + settlement ---')
    const scoringRuleRepo = new ScoringRuleRepository()
    const cacheRepo = new WeeklyScoreCacheRepository()
    const tournamentsRepo = new TournamentsRepository()
    const scoring = new WeeklyScoringService(
        cacheRepo,
        scoringRuleRepo,
        new MlbSportsProvider(),
        new WeeklyLineupRepository(),
    )
    const settlement = new TournamentSettlementService(
        new LeagueRepository(),
        tournamentsRepo,
        cacheRepo,
        new CreditRepository(),
    )

    const leagues = await prisma.league.findMany({
        where: {
            inviteCode: { startsWith: 'SEED-' },
            status: { in: [LeagueStatus.IN_SEASON, LeagueStatus.PLAYOFFS] },
        },
        select: {
            id: true,
            name: true,
            leagueSlug: true,
            externalSeasonId: true,
            startsAt: true,
            totalWeeks: true,
            status: true,
        },
    })

    for (const league of leagues) {
        const currentWeek = computeTournamentCurrentWeek({
            status: league.status,
            startsAt: league.startsAt,
            totalWeeks: league.totalWeeks,
            now: new Date(now),
        })
        if (currentWeek <= 0 || currentWeek > SEED_SETTLE_MAX_SPAN_WEEKS) continue

        const rule = await scoringRuleRepo.findByLeagueId(league.id)
        if (!rule) continue

        const members = await tournamentsRepo.findStandingsMembers(league.id)
        const scoringLeague = {
            id: league.id,
            leagueSlug: league.leagueSlug,
            season: league.externalSeasonId,
            startsAt: league.startsAt,
            totalWeeks: league.totalWeeks,
        }

        try {
            await scoring.warmProviderCache(
                scoringLeague,
                currentWeek,
                members.map((m) => m.id),
            )
            for (const member of members) {
                await scoring.prepareMemberWeeks(member.id, scoringLeague, rule, currentWeek)
            }
            const outcome = await settlement.settleTournament(league.id)
            counters.weeksSettled += outcome.weeksSettled
            counters.payouts += outcome.payouts
            counters.creditsPaid += outcome.creditsPaid
            if (outcome.weeksSettled > 0) {
                console.log(
                    `  + ${league.name}: ${outcome.weeksSettled} week(s), ${outcome.payouts} payout(s), ${outcome.creditsPaid} cr`,
                )
            }
        } catch (error) {
            console.warn(
                `  ! settlement skipped for ${league.name}: ${error instanceof Error ? error.message : String(error)}`,
            )
        }
    }
}

interface SeedCounters {
    seededUserCounter: number
    totalMembers: number
    totalRosterSlots: number
    totalWeeklyLineups: number
    realEnrollments: number
    tournaments: number
    entryFeesCharged: number
    // Running balance of the real commissioner account, decremented as entry
    // fees are charged so each debit row carries a correct `balanceAfter`.
    commissionerBalance: number
    weeksSettled: number
    payouts: number
    creditsPaid: number
    // Pool of bulk demo-user ids handed out as extra competitors, and a cursor
    // into it. Their (fixed) starting balance is tracked so entry-fee rows get
    // a correct `balanceAfter` without a per-user query.
    demoUserIds: string[]
    demoCursor: number
}

// Creates one tournament (a League row), its seeded competitors, and — for
// active tournaments — enrolls the real commissioner account too. `pool` is
// forwarded to every roster build: undefined for MLB (uses the hand-picked
// MLB pool), a provider-derived pool for MiLB levels.
async function seedOneTournament(params: {
    t: SeedTournament
    scoringRuleId: string
    commissioner: { id: string; email: string }
    realCommissioner: boolean
    counters: SeedCounters
    pool?: PoolPlayer[]
    // Enroll the real commissioner account as a competitor (active tournaments
    // only). Off for the generated catalogue so "my tournaments" / "my teams"
    // don't fill with dozens of auto-joined entries.
    enrollReal?: boolean
}): Promise<void> {
    const { t, scoringRuleId, commissioner, realCommissioner, counters, pool } = params
    const enrollReal = params.enrollReal ?? true

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
    // tournaments → 0 (no past weeks); IN_SEASON / PLAYOFFS → up to currentWeek;
    // COMPLETED / ARCHIVED → all totalWeeks.
    const seedCurrentWeek = computeTournamentCurrentWeek({
        status: t.status,
        startsAt,
        totalWeeks: t.totalWeeks,
        now: new Date(now),
    })

    // Build the seeded users (bulk insert), then their enrollments.
    const userRows: {
        id: string
        email: string
        name: string
        emailVerified: boolean
        passwordHash: null
        provider: string
    }[] = []
    const enrollments: MemberEnrollment[] = []

    for (let i = 0; i < t.memberCount; i += 1) {
        counters.seededUserCounter += 1
        const n = counters.seededUserCounter
        const managerName = seededManagerName(n)
        const userId = randomUUID()

        userRows.push({
            id: userId,
            email: seededEmail(managerName, n),
            name: managerName,
            emailVerified: false,
            passwordHash: null,
            provider: 'seed',
        })
        enrollments.push({
            userId,
            teamName: seededTeamName(n),
            seedKey: `${t.slug}:${i + 1}`,
        })
    }

    const active =
        t.status !== LeagueStatus.COMPLETED && t.status !== LeagueStatus.ARCHIVED
    const enrolledReal = enrollReal && realCommissioner && active
    if (enrolledReal) {
        enrollments.push({
            userId: commissioner.id,
            teamName:
                REAL_USER_TEAM_NAMES[counters.realEnrollments % REAL_USER_TEAM_NAMES.length],
            seedKey: `${t.slug}:me`,
        })
        counters.realEnrollments += 1
    }

    // Fill the roster out with bulk demo users (each used in one tournament).
    const demoUserIds: Set<string> = new Set()
    const demoSlice = counters.demoUserIds.slice(
        counters.demoCursor,
        counters.demoCursor + DEMO_MEMBERS_PER_TOURNAMENT,
    )
    counters.demoCursor += demoSlice.length
    demoSlice.forEach((userId, j) => {
        demoUserIds.add(userId)
        enrollments.push({
            userId,
            teamName: seededTeamName(counters.seededUserCounter + j + 1),
            seedKey: `${t.slug}:demo:${j + 1}`,
        })
    })

    if (userRows.length > 0) {
        await prisma.user.createMany({ data: userRows })
    }
    const result = await enrollMembersBulk({
        leagueId: league.id,
        leagueSlug: t.leagueSlug,
        startsAt,
        upToWeek: seedCurrentWeek,
        enrollments,
        pool,
        entryFeeCredits: t.entryFeeCredits,
        commissionerId: commissioner.id,
        commissionerBalanceBefore: counters.commissionerBalance,
        demoUserIds,
    })
    counters.totalMembers += result.members
    counters.totalRosterSlots += result.rosterSlots
    counters.totalWeeklyLineups += result.weeklyLineups
    counters.entryFeesCharged += result.entryFeesCharged
    counters.commissionerBalance = result.commissionerBalanceAfter

    counters.tournaments += 1
    console.log(
        `  + ${t.leagueSlug.padEnd(9)} ${t.name.padEnd(28)} ${t.status.padEnd(10)} ${t.memberCount} members${enrolledReal ? ' + you' : ''} (${seedCurrentWeek} weeks/member)`,
    )
}

// ---------------------------------------------------------------------------
// MiLB tournaments — real data via the same MLB Stats API provider
// ---------------------------------------------------------------------------
//
// Each Minor League level is just a different `sportId` on the same provider.
// For every level we sample a handful of real teams, pull their real rosters,
// and assemble a position pool that `buildDemoRoster` drafts from — so demo
// lineups reference real Triple-A / Double-A / High-A / Single-A players and
// the scoring engine has real box scores to score against.

const MILB_SEED_TOURNAMENTS: SeedTournament[] = [
    {
        slug: 'triple-a-championship',
        name: 'Triple-A Championship',
        leagueSlug: 'triple-a',
        visibility: LeagueVisibility.PUBLIC,
        status: LeagueStatus.IN_SEASON,
        startsInDays: -14,
        totalWeeks: 10,
        entryFeeCredits: 40,
        prizePoolCredits: 9000,
        memberCount: 12,
    },
    {
        slug: 'double-a-fantasy-league',
        name: 'Double-A Fantasy League',
        leagueSlug: 'double-a',
        visibility: LeagueVisibility.PUBLIC,
        status: LeagueStatus.DRAFTING,
        startsInDays: 6,
        totalWeeks: 8,
        entryFeeCredits: 20,
        prizePoolCredits: 4000,
        memberCount: 10,
    },
    {
        slug: 'high-a-challenge',
        name: 'High-A Challenge',
        leagueSlug: 'high-a',
        visibility: LeagueVisibility.PUBLIC,
        status: LeagueStatus.DRAFTING,
        startsInDays: 10,
        totalWeeks: 8,
        entryFeeCredits: 15,
        prizePoolCredits: 3000,
        memberCount: 8,
    },
    {
        slug: 'single-a-prospect-league',
        name: 'Single-A Prospect League',
        leagueSlug: 'single-a',
        visibility: LeagueVisibility.PUBLIC,
        status: LeagueStatus.IN_SEASON,
        startsInDays: -7,
        totalWeeks: 9,
        entryFeeCredits: 10,
        prizePoolCredits: 2500,
        memberCount: 10,
    },
]

const MILB_TEAM_SAMPLE_SIZE = 4
const REQUIRED_POOL_SLOTS: PoolSlotKey[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'OF']

function providerPositionToPoolSlot(position: string): PoolSlotKey | null {
    switch (position) {
        case 'SP':
        case 'RP':
            return 'P'
        case 'C':
        case '1B':
        case '2B':
        case '3B':
        case 'SS':
        case 'OF':
            return position
        case 'DH':
            return 'OF'
        default:
            return null
    }
}

async function buildProviderPool(
    provider: MlbSportsProvider,
    league: SupportedBaseballLeague,
): Promise<PoolPlayer[]> {
    const teams = await provider.getTeams({ league, activeOnly: true, season: 2026 })
    if (teams.length === 0) return []

    const sample = teams.slice(0, MILB_TEAM_SAMPLE_SIZE)
    const pool: PoolPlayer[] = []
    const seen = new Set<number>()

    for (const team of sample) {
        const roster = await provider.getPlayersByTeam(team.id, { league, season: 2026 })
        for (const player of roster) {
            if (seen.has(player.id)) continue
            const slot = providerPositionToPoolSlot(player.primaryPosition)
            if (!slot) continue
            seen.add(player.id)
            pool.push({
                id: player.id,
                name: player.fullName,
                slot,
                team: player.teamName ?? team.name,
            })
        }
    }

    return pool
}

// Every MiLB level we can build a demo pool for. Fetched ONCE and reused
// across every tournament at that level (hand-tuned + generated), since the
// roster fetch is the slow part of the seed.
const MILB_POOL_LEVELS: SupportedBaseballLeague[] = [
    'triple-a',
    'double-a',
    'high-a',
    'single-a',
    'rookie',
]

type MiLBPools = Map<SupportedBaseballLeague, PoolPlayer[]>

async function fetchMiLBPools(provider: MlbSportsProvider): Promise<MiLBPools> {
    const pools: MiLBPools = new Map()
    for (const level of MILB_POOL_LEVELS) {
        try {
            const pool = await buildProviderPool(provider, level)
            const covered = new Set(pool.map((p) => p.slot))
            const missing = REQUIRED_POOL_SLOTS.filter((slot) => !covered.has(slot))
            if (missing.length > 0) {
                console.warn(
                    `  ! ${level} pool incomplete (missing ${missing.join(', ')}) — its tournaments will be skipped`,
                )
                continue
            }
            pools.set(level, pool)
            console.log(`  = ${level} pool: ${pool.length} real players`)
        } catch (error) {
            console.warn(
                `  ! ${level} pool fetch failed: ${error instanceof Error ? error.message : String(error)}`,
            )
        }
    }
    return pools
}

// Resolve the roster pool for a tournament's league. MLB → undefined (uses the
// hand-picked MLB pool). A MiLB level with no usable pool → null (skip it).
function poolForLeague(
    leagueSlug: string,
    pools: MiLBPools,
): PoolPlayer[] | undefined | null {
    if (leagueSlug === 'mlb') return undefined
    return pools.get(leagueSlug as SupportedBaseballLeague) ?? null
}

async function seedTournamentList(params: {
    tournaments: SeedTournament[]
    pools: MiLBPools
    scoringRuleId: string
    commissioner: { id: string; email: string }
    realCommissioner: boolean
    counters: SeedCounters
    enrollReal?: boolean
}): Promise<void> {
    for (const t of params.tournaments) {
        const pool = poolForLeague(t.leagueSlug, params.pools)
        if (pool === null) {
            console.warn(`  ! ${t.name} skipped — no ${t.leagueSlug} pool available`)
            continue
        }
        await seedOneTournament({
            t,
            scoringRuleId: params.scoringRuleId,
            commissioner: params.commissioner,
            realCommissioner: params.realCommissioner,
            counters: params.counters,
            pool: pool ?? undefined,
            enrollReal: params.enrollReal,
        })
    }
}

// ---------------------------------------------------------------------------
// Generated catalogue — ~30 tournaments, evenly spread across the six backed
// leagues, with a realistic status mix (joinable / live / playoffs / done).
// ---------------------------------------------------------------------------

const GEN_LEAGUES: { slug: SupportedBaseballLeague; label: string }[] = [
    { slug: 'mlb', label: 'MLB' },
    { slug: 'triple-a', label: 'AAA' },
    { slug: 'double-a', label: 'AA' },
    { slug: 'high-a', label: 'A+' },
    { slug: 'single-a', label: 'A' },
    { slug: 'rookie', label: 'R' },
]

// At least as many entries as the generated count so tournament names stay
// unique across the catalogue.
const GEN_THEMES = [
    'Opening Series',
    'Midsummer Shootout',
    'Prospect Cup',
    'Diamond Invitational',
    'Pennant Chase',
    'Wildcard Classic',
    'Grand Slam Open',
    'Bullpen Brawl',
    'Division Showdown',
    'September Push',
    'October Gauntlet',
    'Farm System Faceoff',
    'Leadoff League',
    'Extra Innings Cup',
    'First Pitch Invitational',
    'Dog Days Derby',
    'Rally Cap Cup',
    'Small Ball Series',
    'Warning Track Classic',
    'Cycle Chase',
    'Perfect Game Cup',
    'Golden Sombrero Open',
    'Utility Player Invitational',
    'Sacrifice Fly League',
    'Infield Shift Showdown',
    'Twin Killing Cup',
    'Around the Horn Open',
    'Payoff Pitch Classic',
    'Can of Corn Cup',
    'Texas Leaguer Invitational',
    'Southpaw Series',
    'Knuckleball Open',
]

// 30-long status sequence, weighted ~40% DRAFTING / ~35% IN_SEASON /
// ~13% COMPLETED / ~10% PLAYOFFS. Five entries per league, in order.
const GEN_STATUS_SEQUENCE: LeagueStatus[] = [
    LeagueStatus.DRAFTING, LeagueStatus.IN_SEASON, LeagueStatus.DRAFTING, LeagueStatus.COMPLETED, LeagueStatus.IN_SEASON,
    LeagueStatus.DRAFTING, LeagueStatus.IN_SEASON, LeagueStatus.PLAYOFFS, LeagueStatus.DRAFTING, LeagueStatus.IN_SEASON,
    LeagueStatus.DRAFTING, LeagueStatus.COMPLETED, LeagueStatus.IN_SEASON, LeagueStatus.DRAFTING, LeagueStatus.IN_SEASON,
    LeagueStatus.DRAFTING, LeagueStatus.IN_SEASON, LeagueStatus.DRAFTING, LeagueStatus.PLAYOFFS, LeagueStatus.COMPLETED,
    LeagueStatus.DRAFTING, LeagueStatus.IN_SEASON, LeagueStatus.DRAFTING, LeagueStatus.IN_SEASON, LeagueStatus.DRAFTING,
    LeagueStatus.DRAFTING, LeagueStatus.PLAYOFFS, LeagueStatus.IN_SEASON, LeagueStatus.COMPLETED, LeagueStatus.IN_SEASON,
]

function genStartsInDays(status: LeagueStatus, totalWeeks: number, i: number): number {
    switch (status) {
        case LeagueStatus.DRAFTING:
            return 3 + (i % 5) * 4 // 3..19 days out — joinable
        case LeagueStatus.IN_SEASON:
            return -7 * (2 + (i % 3)) // 2..4 weeks in
        case LeagueStatus.PLAYOFFS:
            return -7 * (totalWeeks - 1) // pushes currentWeek to the last week
        case LeagueStatus.COMPLETED:
        default:
            return -7 * totalWeeks - 21 // fully in the past
    }
}

function buildGeneratedTournaments(): SeedTournament[] {
    const out: SeedTournament[] = []
    for (let i = 0; i < GEN_STATUS_SEQUENCE.length; i += 1) {
        const league = GEN_LEAGUES[i % GEN_LEAGUES.length]
        const status = GEN_STATUS_SEQUENCE[i]
        const theme = GEN_THEMES[i % GEN_THEMES.length]
        const totalWeeks = 8 + (i % 3) // 8..10
        const memberCount = 6 + (i % 7) // 6..12
        const entryFeeCredits = 10 + (i % 6) * 10 // 10..60
        const seq = i + 1

        out.push({
            slug: `gen-${league.slug}-${seq}`,
            name: `${league.label} ${theme}`,
            leagueSlug: league.slug,
            visibility: LeagueVisibility.PUBLIC,
            status,
            startsInDays: genStartsInDays(status, totalWeeks, i),
            totalWeeks,
            entryFeeCredits,
            prizePoolCredits: memberCount * entryFeeCredits * (8 + (i % 5)),
            memberCount,
        })
    }
    return out
}

async function ensureCommissioner() {
    // Reuse an existing real user as commissioner (any non-demo user works).
    // Falls back to a dedicated seed-commissioner if no real users exist yet.
    const real = await prisma.user.findFirst({
        where: { email: { not: { endsWith: SEED_USER_EMAIL_SUFFIX } } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, email: true },
    })
    if (real) {
        console.log(`  = Using ${real.email} as commissioner`)
        return real
    }

    const seedCommissionerEmail = `seed-commissioner${SEED_USER_EMAIL_SUFFIX}`
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
