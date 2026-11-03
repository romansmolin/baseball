/** winter-championship remains readable for legacy records; new windows use grand-championship. */
export type RecurringTemplateKey = 'weekly-sprint' | 'diamond-cup' | 'grand-championship' | 'winter-championship'

export interface RecurringTournamentInfo {
    templateKey: RecurringTemplateKey
    registrationClosesAt: string
    outcome: 'STANDARD' | 'VOID'
    scoringState: 'PENDING' | 'PARTIAL' | 'FINAL'
    sourceUpdatedAt: string | null
}

export const RECURRING_SERIES_LABELS: Record<RecurringTemplateKey, string> = {
    'weekly-sprint': 'Weekly Sprint',
    'diamond-cup': 'Diamond Cup',
    'grand-championship': 'Grand Championship',
    'winter-championship': 'Winter Championship',
}
