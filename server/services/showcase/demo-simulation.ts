import { createHash } from 'node:crypto'
import type { DailyPlayer, SaveDailyEntryInput } from '@/shared/daily-contests'
import { FIELD_SLOTS, slotAcceptsPoolPosition } from '@/shared/team-builder'

export const TEAM_PLACES = ['Harbor', 'Golden', 'Northside', 'Brookside', 'Cedar', 'Riverside', 'Silver', 'Westside', 'Eastside', 'Oakland', 'Mountain', 'Pinewood', 'Maple', 'Lakeside', 'Summit', 'Broadway', 'Bridgeport', 'Eastwood', 'Canyon', 'Hilltop', 'Sunset', 'Prairie', 'Bayview', 'Copper', 'Blue Ridge', 'Grandview', 'Fairview', 'Seaside', 'Woodland', 'Highland', 'Kingsway', 'Redwood', 'Northstar', 'Stonebridge', 'Riverbend', 'Southside', 'Parkview', 'Elmwood', 'Meadow', 'Clearwater']
export const TEAM_MASCOTS = ['Hawks', 'Rockets', 'Pilots', 'Falcons', 'Bears', 'Wolves', 'Foxes', 'Comets', 'Mustangs', 'Tigers', 'Knights', 'Eagles', 'Ravens', 'Royals', 'Owls', 'Bulls', 'Sparks', 'Sailors', 'Titans', 'Stars', 'Pioneers', 'Storm', 'Giants', 'Sharks', 'Hurricanes', 'Lions', 'Wildcats', 'Rangers', 'Badgers', 'Dragons', 'Panthers', 'Firebirds', 'Coyotes', 'Mariners', 'Vipers', 'Meteors', 'Thunder', 'Rhinos', 'Hornets', 'Chargers']
const TEAM_ENDINGS = ['', '', '', '', ' BC', ' Nine', ' Baseball', ' Club']

/** A club name for a manager; the same manager keeps it from contest to contest. */
export function demoTeamName(key: string): string {
    const digest = createHash('sha256').update(`team:${key}`).digest()
    return `${TEAM_PLACES[digest.readUInt16BE(0) % TEAM_PLACES.length]} ${TEAM_MASCOTS[digest.readUInt16BE(2) % TEAM_MASCOTS.length]}${TEAM_ENDINGS[digest.readUInt16BE(4) % TEAM_ENDINGS.length]}`
}

export function dailyParticipants(population: number, dayIndex: number, count: number): number[] {
    if (population < 1 || !Number.isInteger(population) || !Number.isInteger(dayIndex) || !Number.isInteger(count) || count < 0) throw new Error('Invalid participant schedule')
    const step = Math.ceil(population / 30)
    const start = ((dayIndex * step) % population + population) % population
    return Array.from({ length: Math.min(count, population) }, (_, n) => (start + n) % population)
}
const WEEKDAY_TURNOUT = [1.25, 0.7, 0.75, 0.8, 0.85, 1.1, 1.35]
const ENTRY_RAMP_MS = 6 * 86400000

const FULL_SLATE_GAMES = 8

/** How many demo entries a slate gets: bigger at weekends, different every day, capped by the population. A slate with only a few games draws a smaller crowd. */
export function demoEntryTarget(contestDate: string, slateKey: string, population: number, games = FULL_SLATE_GAMES): number {
    const date = new Date(`${contestDate}T12:00:00Z`)
    const jitter = 0.75 + (createHash('sha256').update(`${contestDate}:${slateKey}`).digest().readUInt32BE(0) / 0xffffffff) * 0.5
    const scale = (slateKey === 'weekend' ? 1.6 : 1) * Math.min(1, Math.max(0.2, games / FULL_SLATE_GAMES))
    return Math.min(population, Math.round(1500 * WEEKDAY_TURNOUT[date.getUTCDay()] * scale * jitter))
}

const OPENING_WAVE = 0.1

/** A first wave joins at publication, the rest speed up towards the lock, like real sign-ups. */
export function demoEntryTime(contest: { locksAt: Date; createdAt: Date }, index: number, total: number): Date {
    const lock = contest.locksAt.getTime()
    const start = Math.max(contest.createdAt.getTime(), lock - ENTRY_RAMP_MS)
    const opening = Math.ceil(total * OPENING_WAVE)
    if (index < opening) return new Date(start)
    const remaining = 1 - (index - opening) / Math.max(1, total - opening)
    return new Date(lock - Math.max(0, lock - start) * remaining * remaining)
}

/** How many of a contest's demo entries should already have joined at `now`. */
export function demoEntriesDue(contest: { locksAt: Date; createdAt: Date }, total: number, now: Date): number {
    let due = 0
    while (due < total && demoEntryTime(contest, due, total) <= now) due++
    return due
}

export function chooseDemoLineup(pool: DailyPlayer[], seed: string, strategy: string, teamKey = seed): SaveDailyEntryInput {
    // Hash the identity once; integer mixing keeps large simulations cheap and
    // deterministic without performing cryptographic hashing inside each sort.
    const seedHash = createHash('sha256').update(seed).digest().readUInt32BE(0)
    const hash = (id: number, attempt: number) => {
        let value = (seedHash ^ id ^ Math.imul(attempt + 1, 0x9e3779b1)) >>> 0
        value = Math.imul(value ^ (value >>> 16), 0x7feb352d)
        value = Math.imul(value ^ (value >>> 15), 0x846ca68b)
        return (value ^ (value >>> 16)) >>> 0
    }
    for (let attempt = 0; attempt < 50; attempt++) {
        const used = new Set<number>()
        const hashes = new Map<number, number>()
        const players: SaveDailyEntryInput['players'] = []
        let cost = 0
        for (const slot of FIELD_SLOTS) {
            const candidates = pool.filter(p => !used.has(p.externalPlayerId) && slotAcceptsPoolPosition(slot.key, p.position))
            const priority = (p: DailyPlayer) => {
                let jitter = hashes.get(p.externalPlayerId)
                if (jitter === undefined) {
                    jitter = hash(p.externalPlayerId, attempt) / 0xffffffff
                    hashes.set(p.externalPlayerId, jitter)
                }
                if (strategy === 'PITCHING') return jitter + (slot.key === 'P' ? -p.salary / 3000 : p.salary / 10000)
                // Leans towards stars without always picking the priciest player: nine of those cannot fit the cap.
                if (strategy === 'RISKY') return jitter - p.salary / 25000
                return jitter
            }
            const player = candidates.reduce<DailyPlayer | undefined>((best, candidate) => {
                if (!best) return candidate
                return (attempt === 49 ? candidate.salary - best.salary : priority(candidate) - priority(best)) < 0 ? candidate : best
            }, undefined)
            if (!player) throw new Error('Player pool cannot fill a complete lineup')
            used.add(player.externalPlayerId)
            cost += player.salary
            players.push({ slotKey: slot.key, externalPlayerId: player.externalPlayerId })
        }
        if (cost <= 80000) return { teamName: demoTeamName(teamKey), players, captainExternalPlayerId: (strategy === 'PITCHING' ? players.find(p => p.slotKey === 'P') : players[0])!.externalPlayerId }
    }
    throw new Error('Player pool cannot fill a lineup within budget')
}
