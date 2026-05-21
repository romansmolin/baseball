export type OnboardingStepStatus = 'done' | 'next' | 'locked'

export interface OnboardingStep {
    id: string
    index: number
    title: string
    description: string
    status: OnboardingStepStatus
}

export type ContestType = 'Daily' | 'H2H' | 'Weekly'
export type ContestFormat = 'Salary cap' | 'Snake draft' | 'Tournament'

export interface FeaturedContest {
    id: string
    type: ContestType
    format: ContestFormat
    name: string
    prizeCredits: number
    entryFeeCredits: number
    lockInLabel: string
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

export interface ActiveContest {
    id: string
    name: string
    type: ContestType
    status: 'live' | 'upcoming'
    rank?: number
    totalEntries?: number
    currentScore?: number
    leaderScore?: number
    timeRemainingLabel: string
    needsLineup?: boolean
}

export interface TopPerformer {
    id: string
    rank: number
    name: string
    position: string
    team: string
    fantasyPoints: number
}

export type ActivityKind = 'contest_entered' | 'credits_earned' | 'lineup_locked' | 'ai_used'

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
