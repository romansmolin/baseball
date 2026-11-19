// Wire shapes for the admin user lookup. The server builds responses in exactly
// these shapes (dates serialized as ISO strings); the frontend consumes them directly.

import type { WalletTransaction } from '../wallet'

export interface AdminUser {
    id: string
    email: string
    name: string
    role: 'USER' | 'COMMISSIONER' | 'ADMIN'
    status: 'ACTIVE' | 'SUSPENDED' | 'DELETED'
    emailVerified: boolean
    balance: number
    createdAt: string
}

export interface AdminPayment {
    id: string
    status: string
    amountCents: number
    currency: string
    creditAmount: number
    description: string
    createdAt: string
}

export interface AdminTeam {
    id: string
    name: string
    leagueSlug: string
    format: string
    createdAt: string
}

export interface AdminUserActivity {
    user: AdminUser
    balance: number
    batches: { id: string; style: string; count: number; completed: number; failed: number; credits: number; startedAt: string; endedAt: string }[]
    purchases: (AdminPayment & { credits: number })[]
    teams: AdminTeam[]
    transactions: WalletTransaction[]
    payments: AdminPayment[]
}

export interface AdminReportFile {
    file?: { contentType: string; base64: string }
    contentType: string
    base64: string
}
