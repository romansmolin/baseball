import type {
    ExpectedStatsRole,
    ProviderExpectedStats,
} from '../dto/provider-expected-stats.dto'
import { ProviderError, ProviderUnavailableError } from '../sports-provider.error'

import { SAVANT_BASE_URL, SAVANT_REVALIDATE_SECONDS, SAVANT_SELECTIONS } from './savant.const'
import { mapSavantCsvToExpectedStats } from './savant.mapper'

export async function fetchSavantExpectedStats(
    season: number,
    role: ExpectedStatsRole,
): Promise<ProviderExpectedStats[]> {
    const url =
        `${SAVANT_BASE_URL}/leaderboard/custom?year=${season}&type=${role}&min=1` +
        `&selections=${SAVANT_SELECTIONS.join(',')}&csv=true`

    let res: Response
    try {
        res = await fetch(url, {
            signal: AbortSignal.timeout(15000),
            next: { revalidate: SAVANT_REVALIDATE_SECONDS, tags: [`savant:${role}:${season}`] },
        })
    } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'network error'
        throw new ProviderUnavailableError(`Savant ${role} ${season}: ${message}`)
    }

    if (!res.ok) {
        throw new ProviderError(`Savant ${role} ${season}: HTTP ${res.status}`, 502)
    }

    return mapSavantCsvToExpectedStats(await res.text(), season, role)
}
