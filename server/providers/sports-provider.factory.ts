import { env } from '../lib/env'
import { MlbSportsProvider } from './mlb/mlb.provider'
import { ProviderNotConfiguredError } from './sports-provider.error'
import type { ISportsProvider } from './sports-provider.interface'

let cached: ISportsProvider | null = null

export function getSportsProvider(): ISportsProvider {
    if (cached) return cached

    const key = env.sportsProvider()

    switch (key) {
        case 'mlb':
            cached = new MlbSportsProvider()
            return cached
        default:
            throw new ProviderNotConfiguredError(`Unknown SPORTS_PROVIDER: "${key}"`)
    }
}

export function resetSportsProviderForTesting(): void {
    cached = null
}
