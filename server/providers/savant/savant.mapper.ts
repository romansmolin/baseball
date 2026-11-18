import type {
    ExpectedStatsRole,
    ProviderExpectedStats,
} from '../dto/provider-expected-stats.dto'
import { ProviderError } from '../sports-provider.error'

// Minimal RFC 4180 reader: quoted cells may contain commas, doubled quotes and
// line breaks. A leading byte-order mark (Savant sends one) is dropped.
function parseCsv(text: string): string[][] {
    const rows: string[][] = []
    let row: string[] = []
    let cell = ''
    let inQuotes = false
    const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

    for (let i = 0; i < input.length; i++) {
        const char = input[i]
        if (inQuotes) {
            if (char === '"' && input[i + 1] === '"') {
                cell += '"'
                i++
            } else if (char === '"') {
                inQuotes = false
            } else {
                cell += char
            }
        } else if (char === '"') {
            inQuotes = true
        } else if (char === ',') {
            row.push(cell)
            cell = ''
        } else if (char === '\n' || char === '\r') {
            if (char === '\r' && input[i + 1] === '\n') i++
            row.push(cell)
            cell = ''
            if (row.some((value) => value !== '')) rows.push(row)
            row = []
        } else {
            cell += char
        }
    }
    row.push(cell)
    if (row.some((value) => value !== '')) rows.push(row)
    return rows
}

function toNumber(value: string | undefined): number | null {
    if (value === undefined || value.trim() === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

export function mapSavantCsvToExpectedStats(
    csv: string,
    season: number,
    role: ExpectedStatsRole,
): ProviderExpectedStats[] {
    const [header, ...rows] = parseCsv(csv)
    const column = (name: string) => (header ? header.indexOf(name) : -1)

    const idColumn = column('player_id')
    if (idColumn === -1) {
        throw new ProviderError('Savant CSV is missing the player_id column')
    }
    const [xba, xslg, xwoba, barrel, hardHit, sprint] = [
        'xba',
        'xslg',
        'xwoba',
        'barrel_batted_rate',
        'hard_hit_percent',
        'sprint_speed',
    ].map(column)

    const stats: ProviderExpectedStats[] = []
    for (const row of rows) {
        const externalPlayerId = toNumber(row[idColumn])
        if (externalPlayerId === null) continue
        stats.push({
            externalPlayerId,
            season,
            role,
            xba: toNumber(row[xba]),
            xslg: toNumber(row[xslg]),
            xwoba: toNumber(row[xwoba]),
            barrelRate: toNumber(row[barrel]),
            hardHitRate: toNumber(row[hardHit]),
            sprintSpeed: toNumber(row[sprint]),
        })
    }
    return stats
}
