export interface SettlementResult {
    tournamentId: string
    weeksSettled: number
    payouts: number
    creditsPaid: number
}

export interface ITournamentSettlementService {
    /**
     * Pays out every completed-and-unpaid week of one tournament: for each
     * week whose WeeklyScoreCache rows are all FINAL, credits that week's
     * prize slice to the top finishers by weekly points. Idempotent — a week
     * already settled (a matching ledger row exists) is skipped.
     */
    settleTournament(leagueId: string): Promise<SettlementResult>
}
