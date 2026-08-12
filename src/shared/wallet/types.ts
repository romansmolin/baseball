// Wire shapes shared between the wallet API and the frontend. The server
// builds responses in exactly these shapes (dates serialized as ISO strings);
// the frontend consumes them directly.

export type WalletTransactionType =
    | 'PURCHASE'
    | 'REFUND'
    | 'TOURNAMENT_ENTRY_FEE'
    | 'TOURNAMENT_WINNINGS'
    | 'AI_USAGE'
    | 'ADMIN_GRANT'
    | 'ADMIN_DEDUCT'

export type WalletTransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED'

export interface WalletTransaction {
    id: string
    amount: number
    balanceAfter: number
    type: WalletTransactionType
    status: WalletTransactionStatus
    createdAt: string
}

export interface WalletData {
    balance: number
    transactions: WalletTransaction[]
}

export interface CreditPack {
    credits: number
    priceCents: number
    currency: string
    label: string
}

// One step of the custom-amount rate ladder. The rate is an exact ratio
// (credits per amountCents) instead of a float so custom amounts land on the
// same credits-per-euro as the pack that anchors the tier — 2,500 / €15 is not
// an integral rate.
export interface CreditRateTier {
    minAmountCents: number
    credits: number
    perAmountCents: number
}

// Everything the client needs to quote a custom top-up locally. The server
// recomputes the quote at checkout, so this is a preview only.
export interface CreditPricing {
    currency: string
    minAmountCents: number
    maxAmountCents: number
    tiers: CreditRateTier[]
}

export interface CheckoutResponse {
    redirectUrl: string
}
