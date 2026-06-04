export type OnboardingStepStatus = 'done' | 'next' | 'locked'

export interface OnboardingStep {
    id: string
    index: number
    title: string
    description: string
    status: OnboardingStepStatus
}

export interface AIFeature {
    id: string
    name: string
    description: string
    costPerUse: number
    iconKey: 'lineup' | 'analysis' | 'trade' | 'waiver'
}

export interface MetricCard {
    id: string
    label: string
    value: string
    caption: string
    iconKey: 'credits' | 'active' | 'rank' | 'record'
}

export interface TopPerformer {
    id: string
    rank: number
    name: string
    position: string
    team: string
    fantasyPoints: number
}

export type ActivityKind = 'credits_earned' | 'lineup_locked' | 'ai_used'

export interface ActivityEvent {
    id: string
    kind: ActivityKind
    label: string
    detail: string
    timestamp: string
}

export interface DashboardUser {
    name: string
    email: string
    initials: string
}

export interface CreditsSummary {
    balance: number
    signupBonusAwardedAt: string | null
    latestEvent: {
        kind: 'signup_bonus' | 'purchase' | 'reward' | 'spend'
        amount: number
        label: string
        at: string
    } | null
}

export interface DashboardMetrics {
    credits: number
    bestRankThisWeek: { rank: number; total: number; tournamentName: string } | null
    leagueRecord: { wins: number; losses: number; leagueName: string } | null
}
