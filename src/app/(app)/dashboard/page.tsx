import { headers } from 'next/headers'

import { auth } from '@/shared/lib/auth'
import { DashboardView } from '@/views/dashboard/dashboard-view'

import { getSportsProvider } from '../../../../server/providers/sports-provider.factory'
import { FantasyTeamRepository } from '../../../../server/repositories/fantasy-team/fantasy-team.repository'
import { LeagueMemberRepository } from '../../../../server/repositories/league-member/league-member.repository'
import { LeagueRepository } from '../../../../server/repositories/league/league.repository'
import { ScoringRuleRepository } from '../../../../server/repositories/scoring-rule/scoring-rule.repository'
import { WeeklyLineupRepository } from '../../../../server/repositories/weekly-lineup/weekly-lineup.repository'
import { WeeklyScoreCacheRepository } from '../../../../server/repositories/weekly-score-cache/weekly-score-cache.repository'
import { MeService } from '../../../../server/services/me/me.service'
import { WeeklyScoringService } from '../../../../server/services/scoring/weekly-scoring.service'

const scoringRuleRepository = new ScoringRuleRepository()
const weeklyScoringService = new WeeklyScoringService(
    new WeeklyScoreCacheRepository(),
    scoringRuleRepository,
    getSportsProvider(),
    new WeeklyLineupRepository(),
)

const meService = new MeService(
    new FantasyTeamRepository(),
    new LeagueRepository(),
    new LeagueMemberRepository(),
    weeklyScoringService,
    scoringRuleRepository,
)

export default async function DashboardPage() {
    const session = await auth.api.getSession({ headers: await headers() })
    const userId = session?.user.id ?? ''

    let view: 'new' | 'returning' = 'new'
    if (userId) {
        try {
            const steps = await meService.getOnboarding(userId)
            view = steps.length > 0 && steps.every((s) => s.status === 'done') ? 'returning' : 'new'
        } catch {
            view = 'returning'
        }
    }

    return <DashboardView userName={session?.user.name ?? ''} view={view} />
}
