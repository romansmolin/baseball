import type { BaseballScoringRule } from '../../services/scoring/scoring-rule.schema'

// Frontend-facing record. The raw JSON column has already been validated +
// parsed by the repository before crossing this boundary, so callers can use
// `rule` directly without re-parsing.
export interface ScoringRuleRecord {
    id: string
    name: string
    version: number
    rule: BaseballScoringRule
}

export interface IScoringRuleRepository {
    findByLeagueId(leagueId: string): Promise<ScoringRuleRecord | null>
}
