import { Prisma } from '../../../../src/generated/prisma/client'
import type { DailyEntrySlot, DailyGame } from '@/shared/daily-contests'
import type { DailyStars, StatStar, StatsTrendPoint } from '@/shared/stats'
import type {
    ProviderBatterLine,
    ProviderBoxScore,
    ProviderPitcherLine,
} from '../../../providers/dto/provider-schedule.dto'
import { prisma } from '../../../lib/prisma'
import { showcaseEnabled } from '../../../shared/showcase-config'
import type { IStarsService } from './stars.service.interface'

const TREND_DAYS = 14

// MLB reports innings as decimals here (6.667); baseball prints them as 6.2.
const innings = (ip: number) => {
    const whole = Math.floor(ip)
    return `${whole}.${Math.round((ip - whole) * 3)}`
}

export function formatStatLine(batter?: ProviderBatterLine, pitcher?: ProviderPitcherLine): string {
    if (pitcher) {
        return [
            `${innings(pitcher.inningsPitched)} IP`,
            `${pitcher.strikeOuts} K`,
            `${pitcher.earnedRuns} ER`,
            pitcher.win ? 'W' : null,
        ]
            .filter(Boolean)
            .join(' · ')
    }
    if (!batter) return ''
    return [
        batter.homeRuns > 0 ? `${batter.homeRuns} HR` : null,
        batter.rbi > 0 ? `${batter.rbi} RBI` : null,
        batter.hits > 0 ? `${batter.hits} H` : null,
        batter.runs > 0 ? `${batter.runs} R` : null,
        batter.stolenBases > 0 ? `${batter.stolenBases} SB` : null,
    ]
        .filter(Boolean)
        .slice(0, 3)
        .join(' · ')
}

/** Best raw score per player across all lineups, highest first. */
export function rankStarSlots(slots: DailyEntrySlot[], limit: number): DailyEntrySlot[] {
    const best = new Map<number, DailyEntrySlot>()
    for (const slot of slots) {
        const seen = best.get(slot.player.externalPlayerId)
        if (!seen || slot.rawPoints > seen.rawPoints) best.set(slot.player.externalPlayerId, slot)
    }
    return [...best.values()]
        .sort((a, b) => b.rawPoints - a.rawPoints || a.player.externalPlayerId - b.player.externalPlayerId)
        .slice(0, limit)
}

export class StarsService implements IStarsService {
    async getStars(limit: number): Promise<DailyStars> {
        if (!showcaseEnabled()) return { contest: null, stars: [], trend: [] }

        const [contest, trend] = await Promise.all([this.latestStars(limit), this.trend()])
        return { contest: contest?.contest ?? null, stars: contest?.stars ?? [], trend }
    }

    private async latestStars(limit: number): Promise<Pick<DailyStars, 'contest' | 'stars'> | null> {
        const row = await prisma.dailyContest.findFirst({
            where: { mode: 'LIVE', status: 'COMPLETED' },
            orderBy: { contestDate: 'desc' },
            select: { id: true, name: true, contestDate: true, games: true, entries: { select: { lineup: true } } },
        })
        if (!row) return null

        const slots = rankStarSlots(
            row.entries.flatMap((e) => e.lineup as unknown as DailyEntrySlot[]),
            limit,
        )
        const games = row.games as unknown as DailyGame[]
        const gameOf = (teamId: number) =>
            games.find((g) => g.homeTeamId === teamId || g.awayTeamId === teamId)
        const snapshots = await prisma.dailyGameSnapshot.findMany({
            where: { gamePk: { in: slots.flatMap((s) => gameOf(s.player.teamId)?.gamePk ?? []) } },
            select: { gamePk: true, boxScore: true },
        })
        const boxes = new Map(snapshots.map((s) => [s.gamePk, s.boxScore as unknown as ProviderBoxScore | null]))

        const stars: StatStar[] = slots.map((slot, i) => {
            const box = boxes.get(gameOf(slot.player.teamId)?.gamePk ?? -1)
            const id = slot.player.externalPlayerId
            return {
                id: String(id),
                rank: i + 1,
                name: slot.player.name,
                position: slot.player.position,
                team: slot.player.teamName,
                photoUrl: slot.player.photoUrl,
                fantasyPoints: slot.rawPoints,
                // Box scores list every player in both arrays; the position decides which line counts.
                statLine:
                    slot.player.position === 'P'
                        ? formatStatLine(undefined, box?.pitchers.find((p) => p.externalPlayerId === id))
                        : formatStatLine(box?.batters.find((x) => x.externalPlayerId === id)),
            }
        })
        return { contest: { id: row.id, name: row.name, date: row.contestDate }, stars }
    }

    private async trend(): Promise<StatsTrendPoint[]> {
        const rows = await prisma.$queryRaw<{ date: string; best: number; average: number }[]>(Prisma.sql`
            SELECT c."contestDate" AS date, MAX(e.points)::float AS best, AVG(e.points)::float AS average
            FROM "DailyEntry" e JOIN "DailyContest" c ON c.id = e."contestId"
            WHERE c.mode = 'LIVE' AND c.status = 'COMPLETED' AND e."isFinal" = true
            GROUP BY c."contestDate" ORDER BY c."contestDate" DESC LIMIT ${TREND_DAYS}`)
        return rows.reverse().map((r) => ({ date: r.date, best: Number(r.best), average: Number(r.average) }))
    }
}
