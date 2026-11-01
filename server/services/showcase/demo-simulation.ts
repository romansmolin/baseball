import { createHash } from 'node:crypto'
import type { DailyPlayer, SaveDailyEntryInput } from '@/shared/daily-contests'
import { FIELD_SLOTS, slotAcceptsPoolPosition } from '@/shared/team-builder'

export function dailyParticipants(population: number, dayIndex: number, count: number): number[] {
    if (population < 1 || !Number.isInteger(population) || !Number.isInteger(dayIndex) || !Number.isInteger(count) || count < 0) throw new Error('Invalid participant schedule')
    const step = Math.ceil(population / 30)
    const start = ((dayIndex * step) % population + population) % population
    return Array.from({ length: Math.min(count, population) }, (_, n) => (start + n) % population)
}
export function chooseDemoLineup(pool: DailyPlayer[], seed: string, strategy: string): SaveDailyEntryInput {
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
                if (strategy === 'RISKY') return jitter - p.salary / 7000
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
        if (cost <= 80000) return { teamName: `${strategy === 'RISKY' ? 'Wild' : strategy === 'PITCHING' ? 'Ace' : 'Diamond'} ${seed.slice(-8)}`, players, captainExternalPlayerId: (strategy === 'PITCHING' ? players.find(p => p.slotKey === 'P') : players[0])!.externalPlayerId }
    }
    throw new Error('Player pool cannot fill a lineup within budget')
}
