export type RecurringTemplateKey = 'weekly-sprint' | 'diamond-cup' | 'winter-championship'

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
    'winter-championship': 'Winter Championship',
}
