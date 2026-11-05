import type { PlayerSeasonStatLine } from '../../providers/dto/provider-player.dto'

const MIN_SALARY = 3000
const MAX_SALARY = 10000
const NO_RECORD_SALARY = 4000
/** Too few appearances say little about a player, so a small sample cannot reach the top tiers. */
const SMALL_SAMPLE_CAP = 5500

const stat = (line: PlayerSeasonStatLine | undefined, key: string): number => Number(line?.[key] ?? Number.NaN)

/** Maps a value between a poor and a great mark onto the salary range, in steps of 100. */
function scale(value: number, poor: number, great: number): number {
    const share = Math.min(1, Math.max(0, (value - poor) / (great - poor)))
    return Math.round((MIN_SALARY + share * (MAX_SALARY - MIN_SALARY)) / 100) * 100
}

function hittingSalary(line: PlayerSeasonStatLine | undefined): number | null {
    const ops = stat(line, 'ops')
    if (!Number.isFinite(ops)) return null
    const salary = scale(ops, 0.55, 0.95)
    return stat(line, 'plateAppearances') >= 100 ? salary : Math.min(salary, SMALL_SAMPLE_CAP)
}

function pitchingSalary(line: PlayerSeasonStatLine | undefined): number | null {
    const era = stat(line, 'era')
    if (!Number.isFinite(era)) return null
    const salary = scale(-era, -6, -2.5)
    return Number(line?.inningsPitched ?? 0) >= 30 ? salary : Math.min(salary, SMALL_SAMPLE_CAP)
}

/** A player costs what their last season earned; two-way players are priced on their better side. */
export function playerSalary(player: { battingStats?: PlayerSeasonStatLine; pitchingStats?: PlayerSeasonStatLine }): number {
    const prices = [hittingSalary(player.battingStats), pitchingSalary(player.pitchingStats)].filter((price): price is number => price !== null)
    return prices.length ? Math.max(...prices) : NO_RECORD_SALARY
}

/** The last season with a meaningful sample: before June the current year has barely started. */
export function salaryStatsSeason(apiSeason: number, now: Date): number {
    const latest = now.getUTCMonth() < 5 ? now.getUTCFullYear() - 1 : now.getUTCFullYear()
    return Math.min(apiSeason, latest)
}
