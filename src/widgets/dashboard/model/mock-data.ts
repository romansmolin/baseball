// MOCK — replace with fetchers when API is ready.
import type {
    ActiveContest,
    ActivityEvent,
    AIFeature,
    FeaturedContest,
    MetricCard,
    OnboardingStep,
    TopPerformer,
} from './dashboard.type'

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
        id: 'contest',
        index: 3,
        title: 'Enter a contest',
        description: 'Join a free contest to get started.',
        status: 'locked',
    },
]

export const featuredContests: FeaturedContest[] = [
    {
        id: 'showdown',
        type: 'Daily',
        format: 'Salary cap',
        name: 'MLB Showdown',
        prizeCredits: 500,
        entryFeeCredits: 0,
        lockInLabel: 'Locks in 3h 20m',
    },
    {
        id: 'h2h',
        type: 'H2H',
        format: 'Salary cap',
        name: 'Head to head',
        prizeCredits: 180,
        entryFeeCredits: 100,
        lockInLabel: 'Locks in 3h 20m',
    },
    {
        id: 'weekly',
        type: 'Weekly',
        format: 'Tournament',
        name: 'Weekly tournament',
        prizeCredits: 5000,
        entryFeeCredits: 50,
        lockInLabel: 'Locks in 1d 4h',
    },
]

export const aiFeatures: AIFeature[] = [
    {
        id: 'lineup',
        name: 'Lineup optimizer',
        description: 'Best lineup for your budget',
        costPerUse: 20,
        iconKey: 'lineup',
    },
    {
        id: 'analysis',
        name: 'Player analysis',
        description: 'Stats, trends, matchups',
        costPerUse: 10,
        iconKey: 'analysis',
    },
    {
        id: 'trade',
        name: 'Trade advisor',
        description: 'Evaluate trade offers',
        costPerUse: 15,
        iconKey: 'trade',
    },
    {
        id: 'waiver',
        name: 'Waiver wire',
        description: 'Find hidden value',
        costPerUse: 10,
        iconKey: 'waiver',
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
        id: 'active',
        label: 'Active contests',
        value: '3',
        caption: '2 live · 1 upcoming',
        iconKey: 'active',
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

export const activeContests: ActiveContest[] = [
    {
        id: 'showdown-live',
        name: 'MLB Showdown',
        type: 'Daily',
        status: 'live',
        rank: 18,
        totalEntries: 2400,
        currentScore: 84.5,
        leaderScore: 102.1,
        timeRemainingLabel: '4 of 9 games left',
    },
    {
        id: 'h2h-live',
        name: 'Head to head vs. dugout_king',
        type: 'H2H',
        status: 'live',
        currentScore: 41.2,
        leaderScore: 38.7,
        timeRemainingLabel: '6 of 12 games left',
    },
    {
        id: 'weekly-upcoming',
        name: 'Weekly tournament',
        type: 'Weekly',
        status: 'upcoming',
        timeRemainingLabel: 'Locks in 1d 4h',
        needsLineup: true,
    },
]

export const topPerformers: TopPerformer[] = [
    { id: '1', rank: 1, name: 'Aaron Judge', position: 'OF', team: 'NYY', fantasyPoints: 38.4 },
    { id: '2', rank: 2, name: 'Shohei Ohtani', position: 'DH', team: 'LAD', fantasyPoints: 36.1 },
    { id: '3', rank: 3, name: 'Ronald Acuña Jr.', position: 'OF', team: 'ATL', fantasyPoints: 34.7 },
    { id: '4', rank: 4, name: 'Mookie Betts', position: 'OF', team: 'LAD', fantasyPoints: 31.5 },
    { id: '5', rank: 5, name: 'Freddie Freeman', position: '1B', team: 'LAD', fantasyPoints: 29.2 },
]

export const recentActivity: ActivityEvent[] = [
    {
        id: 'a1',
        kind: 'contest_entered',
        label: 'Entered MLB Showdown',
        detail: 'Daily · 100 cr entry',
        timestamp: '12 min ago',
    },
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
