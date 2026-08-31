// Each tournament week distributes an equal slice of the prize pool
// (`prizePoolCredits / totalWeeks`, the last week absorbing the remainder).
// These are the fractions of that weekly slice paid to 1st / 2nd / 3rd place
// by that week's points. If a week has fewer than three scored members the
// splits are renormalised over the members present.
export const WEEKLY_PAYOUT_SPLITS = [0.5, 0.3, 0.2] as const

// Ledger markers for tournament money movement.
export const ENTRY_FEE_REFERENCE_TYPE = 'tournament_entry'
export const WEEK_PAYOUT_REFERENCE_TYPE = 'tournament_week_payout'
