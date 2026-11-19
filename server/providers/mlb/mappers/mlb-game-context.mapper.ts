import type { ProviderGameContext, ProviderTeamRecord } from '../../dto/provider-game-context.dto'
import type { ProviderPlayer } from '../../dto/provider-player.dto'
import type { MlbRawScheduleGame, MlbRawScheduleTeamSide } from '../types/mlb-schedule.raw'

import { mapMlbScheduleGameToProvider } from './mlb-schedule.mapper'

function mapRecord(side: MlbRawScheduleTeamSide): ProviderTeamRecord | null {
    const record = side.leagueRecord
    return record ? { wins: record.wins, losses: record.losses } : null
}

export function mapMlbScheduleGameToContext(
    raw: MlbRawScheduleGame,
    pitchersById: Map<number, ProviderPlayer>,
): ProviderGameContext {
    const pitcherOf = (side: MlbRawScheduleTeamSide) =>
        side.probablePitcher ? (pitchersById.get(side.probablePitcher.id) ?? null) : null

    const temp = raw.weather?.temp ? Number(raw.weather.temp) : NaN

    return {
        game: mapMlbScheduleGameToProvider(raw),
        venue: raw.venue ? { id: raw.venue.id, name: raw.venue.name } : null,
        weather: raw.weather
            ? {
                  condition: raw.weather.condition ?? '',
                  tempF: Number.isFinite(temp) ? temp : null,
                  wind: raw.weather.wind ?? '',
              }
            : null,
        probablePitchers: {
            home: pitcherOf(raw.teams.home),
            away: pitcherOf(raw.teams.away),
        },
        records: { home: mapRecord(raw.teams.home), away: mapRecord(raw.teams.away) },
        lineupsPosted:
            (raw.lineups?.homePlayers?.length ?? 0) > 0 &&
            (raw.lineups?.awayPlayers?.length ?? 0) > 0,
    }
}
