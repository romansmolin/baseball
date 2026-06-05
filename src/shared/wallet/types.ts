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

export interface CheckoutResponse {
    redirectUrl: string
}
