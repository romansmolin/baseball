import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'
import type { ForecastPeriod, ScoringRules } from '@/shared/team-builder'

import type { ProjectionsResult } from '../model/projection.type'

import { mapProjectionsToModel } from './mappers'
import type { ProjectionsResponseDto } from './types'

export interface FetchProjectionsArgs {
    leagueSlug: string
    teamIds: number[]
    // Players on the lineup whose teams are not on screen.
    playerIds?: number[]
    period: ForecastPeriod
    rules: ScoringRules
}

export const fetchProjections = withErrorHandling(
    async ({ leagueSlug, teamIds, playerIds = [], period, rules }: FetchProjectionsArgs): Promise<ProjectionsResult> => {
        const dto = await httpClient.post<ProjectionsResponseDto>('/api/me/projections', {
            league: leagueSlug,
            teamIds,
            playerIds,
            period,
            rules,
        })
        return mapProjectionsToModel(dto)
    },
)
