import type { AnalysisPitcher, GameAnalysis } from '../model/types'

import type { GameAnalysisResponseDto } from './types'

type PitcherDto = NonNullable<GameAnalysisResponseDto['output']['matchup']['starters']['home']>

const mapPitcher = (dto: PitcherDto | null): AnalysisPitcher | null =>
    dto && { name: dto.fullName, era: dto.era, inningsPitched: dto.inningsPitched, throws: dto.throws }

export function mapGameAnalysisResponseToModel(dto: GameAnalysisResponseDto): GameAnalysis {
    const { output } = dto
    return {
        gamePk: output.gamePk,
        summary: output.summary,
        outlook: output.outlook,
        keyFactors: output.keyFactors,
        picks: output.picks.map((pick) => ({
            playerId: pick.externalPlayerId,
            playerName: pick.playerName,
            role: pick.role,
            reason: pick.reason,
        })),
        matchup: {
            lean: output.matchup.lean,
            homeWinProbability: output.matchup.homeWinProbability,
            confidence: output.matchup.confidence,
            factors: output.matchup.factors,
            weather: output.matchup.weather,
            starters: {
                home: mapPitcher(output.matchup.starters.home),
                away: mapPitcher(output.matchup.starters.away),
            },
        },
    }
}
