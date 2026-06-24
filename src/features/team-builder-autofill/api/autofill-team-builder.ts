import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'
import type { SlotKey } from '@/shared/team-builder'

export interface AutofillRequest {
    mlbTeamIds: number[]
    salaryCap: number
    riskProfile?: 'safe' | 'balanced' | 'high_ceiling'
    filledSlots: Array<{ slotKey: SlotKey; externalPlayerId: number }>
}

export interface AutofillSuggestion {
    slotKey: SlotKey
    externalPlayerId: number
    playerName: string
}

export interface AutofillResponse {
    suggestedPicks: AutofillSuggestion[]
    strategy: string
    salaryUsed: number
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
