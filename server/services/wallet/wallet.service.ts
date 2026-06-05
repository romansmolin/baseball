// Read model for the wallet page: the user's live balance and recent ledger
// activity, plus the catalog of credit packs on sale. Balance and history both
// come from the CreditTransaction ledger; packs come from the server-owned
// pricing table so the frontend never invents an amount the gateway won't
// honor.

import type { ICreditRepository } from '../../repositories/credit/credit.repository.interface'

import { CREDIT_PACKS } from '../payment/credit-pricing'
import type { IWalletService } from './wallet.service.interface'
import type { CreditsSummary } from '@/shared/dashboard'
import type { CreditPack, WalletData, WalletTransaction, WalletTransactionType } from '@/shared/wallet'

type CreditEventKind = NonNullable<CreditsSummary['latestEvent']>['kind']

// Maps a ledger transaction type to the coarse "kind" the dashboard credits
// widget understands.
const KIND_BY_TYPE: Record<WalletTransactionType, CreditEventKind> = {
    PURCHASE: 'purchase',
    REFUND: 'reward',
    TOURNAMENT_WINNINGS: 'reward',
    ADMIN_GRANT: 'reward',
    TOURNAMENT_ENTRY_FEE: 'spend',
    AI_USAGE: 'spend',
    ADMIN_DEDUCT: 'spend',
}

const LABEL_BY_TYPE: Record<WalletTransactionType, string> = {
    PURCHASE: 'Credit purchase',
    REFUND: 'Refund',
    TOURNAMENT_WINNINGS: 'Tournament winnings',
    ADMIN_GRANT: 'Credits granted',
    TOURNAMENT_ENTRY_FEE: 'Tournament entry',
    AI_USAGE: 'AI feature used',
    ADMIN_DEDUCT: 'Credits deducted',
}

const relativeTime = (date: Date): string => {
    const diffMs = Date.now() - date.getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins} min ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} h ago`
    const days = Math.floor(hours / 24)
    return days === 1 ? 'yesterday' : `${days} d ago`
}

export class WalletService implements IWalletService {
    private readonly creditRepository: ICreditRepository

    constructor(creditRepository: ICreditRepository) {
        this.creditRepository = creditRepository
    }

    async getWallet(userId: string): Promise<WalletData> {
        const [balance, transactions] = await Promise.all([
            this.creditRepository.getBalance(userId),
            this.creditRepository.getTransactions(userId, 50),
        ])

        const mapped: WalletTransaction[] = transactions.map((tx) => ({
            id: tx.id,
            amount: tx.amount,
            balanceAfter: tx.balanceAfter,
            type: tx.type as WalletTransaction['type'],
            status: tx.status as WalletTransaction['status'],
            createdAt: tx.createdAt.toISOString(),
        }))

        return { balance, transactions: mapped }
    }

    // Compact summary for the dashboard / header: live balance + the single
    // most recent ledger event, formatted for display.
    async getCreditsSummary(userId: string): Promise<CreditsSummary> {
        const [balance, transactions] = await Promise.all([
            this.creditRepository.getBalance(userId),
            this.creditRepository.getTransactions(userId, 1),
        ])

        const latest = transactions[0]
        if (!latest) {
            return { balance, signupBonusAwardedAt: null, latestEvent: null }
        }

        const type = latest.type as WalletTransactionType

        return {
            balance,
            signupBonusAwardedAt: null,
            latestEvent: {
                kind: KIND_BY_TYPE[type],
                amount: latest.amount,
                label: LABEL_BY_TYPE[type],
                at: relativeTime(latest.createdAt),
            },
        }
    }

    getPacks(): CreditPack[] {
        return [...CREDIT_PACKS]
    }
}
