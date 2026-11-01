import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { DailyCalendarService } from '../daily-contests/daily-calendar.service'
import { canPublishPool } from '../daily-contests/daily-rules'
import { collectPlayableReplayDays } from './replay-days'

export async function prepareReplayArchive(calendar: DailyCalendarService, count: number) {
    const directory = join(process.cwd(), '.showcase-data', 'archive-2025')
    await mkdir(directory, { recursive: true })
    const candidates = Array.from({ length: 93 }, (_, n) => new Date(Date.UTC(2025, 6, n + 1)).toISOString().slice(0, 10))
    return collectPlayableReplayDays(candidates, count, async sourceDate => {
        const path = join(directory, `${sourceDate}.json`)
        let day: Awaited<ReturnType<DailyCalendarService['loadReplayDay']>>
        try { day = JSON.parse(await readFile(path, 'utf8')) }
        catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
            try { day = await calendar.loadReplayDay({ season: 2025, sourceDate }) }
            catch (loadError) { if (loadError instanceof Error && loadError.message.startsWith('Incomplete archive game')) return null; throw loadError }
            if (!day.games.length || !canPublishPool(day.players, 80000)) return null
            await writeFile(`${path}.tmp`, JSON.stringify(day), { mode: 0o600 })
            await rename(`${path}.tmp`, path)
        }
        if (day.sourceDate !== sourceDate || !day.games.length || !canPublishPool(day.players, 80000) || day.boxScores.length !== day.games.length || day.boxScores.some(box => box.status !== 'FINAL' || !box.batters.length && !box.pitchers.length)) throw new Error(`Invalid archived day ${sourceDate}`)
        return day
    })
}
