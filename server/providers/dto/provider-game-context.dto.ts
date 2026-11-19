import type { ProviderPlayer } from './provider-player.dto'
import type { ProviderScheduledGame } from './provider-schedule.dto'

export interface ProviderTeamRecord {
    wins: number
    losses: number
}

export interface ProviderGameContext {
    game: ProviderScheduledGame
    venue: { id: number; name: string } | null
    weather: { condition: string; tempF: number | null; wind: string } | null
    probablePitchers: { home: ProviderPlayer | null; away: ProviderPlayer | null }
    records: { home: ProviderTeamRecord | null; away: ProviderTeamRecord | null }
    lineupsPosted: boolean
}
