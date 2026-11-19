export interface AIFeature {
    id: string
    name: string
    description: string
    costPerUse: number
    iconKey: 'lineup' | 'analysis' | 'trade' | 'autofill'
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

