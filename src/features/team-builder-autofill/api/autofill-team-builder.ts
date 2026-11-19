import type { SupportedBaseballLeague } from '@/shared/baseball'
import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'
import type {
    CategoryKey,
    FantasyFormat,
    ForecastPeriod,
    PoolPosition,
    ScoringRules,
    SlotConfig,
    SlotId,
} from '@/shared/team-builder'

export interface AutofillRequest {
    league: SupportedBaseballLeague
    mlbTeamIds: number[]
    format: FantasyFormat
    period: ForecastPeriod
    rules: ScoringRules
    // Categories formats: the categories that count.
    categories?: CategoryKey[]
    slotConfig: SlotConfig
    salaryCap: number | null
    filledSlots: Array<{ slotId: SlotId; externalPlayerId: number }>
}

export interface AutofillSuggestion {
    slotId: SlotId
    externalPlayerId: number
    playerName: string
    projectedPoints: number
    // What the pick was chosen on: points in H2H Points, category strength otherwise.
    score: number
    position: PoolPosition
    teamName: string
    photoUrl: string | null
}

export type AutofillUnfilledCode =
    | 'NO_ELIGIBLE_PLAYER'
    | 'NO_PROJECTION'
    | 'CAP_TOO_LOW'
    | 'POOL_EMPTY'

export interface AutofillUnfilledSlot {
    slotId: SlotId
    code: AutofillUnfilledCode
    message: string
}

export interface AutofillResponse {
    suggestedPicks: AutofillSuggestion[]
    unfilled: AutofillUnfilledSlot[]
    explanation: string
    totalPoints: number
    basis: 'schedule' | 'season-pace'
}

interface ApiEnvelope {
    output: AutofillResponse
    modelUsed: string
    tokenUsage: { inputTokens: number; outputTokens: number }
}

export const autofillTeamBuilder = withErrorHandling(
    async (req: AutofillRequest): Promise<AutofillResponse> => {
        const result = await httpClient.post<ApiEnvelope>(
            '/api/me/ai/team-builder-autofill',
            req,
        )
        return result.output
    },
)
