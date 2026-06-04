import { prisma } from '../../lib/prisma'
import { parseScoringRule } from '../../services/scoring/scoring-rule.schema'
import { handleRepositoryError } from '../../shared/db/prisma-error.utils'

import type {
    IScoringRuleRepository,
    ScoringRuleRecord,
} from './scoring-rule.repository.interface'

export class ScoringRuleRepository implements IScoringRuleRepository {
    async findByLeagueId(leagueId: string): Promise<ScoringRuleRecord | null> {
        try {
            const league = await prisma.league.findUnique({
                where: { id: leagueId },
                include: { scoringRule: true },
            })

            if (!league) return null

            const rule = parseScoringRule(league.scoringRule.rules)

            return {
                id: league.scoringRule.id,
                name: league.scoringRule.name,
                version: league.scoringRule.version,
                rule,
            }
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }
}
