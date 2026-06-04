import type {
    ActivityEvent,
    CreditsSummary,
    DashboardMetrics,
    MetricCard,
    OnboardingStep,
} from '@/shared/dashboard'

export const onboardingSteps: OnboardingStep[] = [
    {
        id: 'account',
        index: 1,
        title: 'Account created',
        description: "You're in. 250 bonus credits added.",
        status: 'done',
    },
    {
        id: 'team',
        index: 2,
        title: 'Build your first team',
        description: "Pick players from today's MLB slate.",
        status: 'next',
    },
    {
        id: 'tournament',
        index: 3,
        title: 'Join a tournament',
        description: 'Enter a tournament to compete for prizes.',
        status: 'locked',
    },
]

export const metricCards: MetricCard[] = [
    {
        id: 'credits',
        label: 'Credits',
        value: '1,420',
        caption: '+250 this week',
        iconKey: 'credits',
    },
    {
        id: 'rank',
        label: 'Best rank this week',
        value: '#12',
        caption: 'of 2,400 in MLB Showdown',
        iconKey: 'rank',
    },
    {
        id: 'record',
        label: 'League record',
        value: '6 – 2',
        caption: 'Diamond Dynasty',
        iconKey: 'record',
    },
]

export const recentActivity: ActivityEvent[] = [
    {
        id: 'a2',
        kind: 'lineup_locked',
        label: 'Lineup locked for Head to head',
        detail: '9 of 9 slots filled',
        timestamp: '1 h ago',
    },
    {
        id: 'a3',
        kind: 'credits_earned',
        label: '+250 credits awarded',
        detail: 'Weekly streak bonus',
        timestamp: '3 h ago',
    },
    {
        id: 'a4',
        kind: 'ai_used',
        label: 'Lineup optimizer used',
        detail: 'MLB Showdown · 20 cr',
        timestamp: 'Yesterday',
    },
]

export const creditsSummary: CreditsSummary = {
    balance: 250,
    signupBonusAwardedAt: 'just now',
    latestEvent: {
        kind: 'signup_bonus',
        amount: 250,
        label: '250 bonus credits from sign-up',
        at: 'just now',
    },
}

export const dashboardMetrics: DashboardMetrics = {
    credits: 1420,
    bestRankThisWeek: { rank: 12, total: 2400, tournamentName: 'MLB Showdown' },
    leagueRecord: { wins: 6, losses: 2, leagueName: 'Diamond Dynasty' },
}
