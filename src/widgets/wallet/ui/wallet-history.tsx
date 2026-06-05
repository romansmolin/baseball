'use client'

import { useWalletData } from '@/entities/wallet'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { cn } from '@/shared/utils'
import type { WalletTransactionType } from '@/shared/wallet'

const TYPE_LABEL: Record<WalletTransactionType, string> = {
    PURCHASE: 'Purchase',
    REFUND: 'Refund',
    TOURNAMENT_ENTRY_FEE: 'Entry fee',
    TOURNAMENT_WINNINGS: 'Winnings',
    AI_USAGE: 'AI feature',
    ADMIN_GRANT: 'Grant',
    ADMIN_DEDUCT: 'Adjustment',
}

const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })

export const WalletHistory = () => {
    const { data, isLoading } = useWalletData()
    const transactions = data?.transactions ?? []

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Transaction history</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="h-10 animate-pulse rounded bg-muted" />
                        ))}
                    </div>
                ) : transactions.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        Nothing here yet — your credit history will show up after your first
                        transaction.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-foreground/10 text-left text-xs text-muted-foreground">
                                    <th className="py-2 pr-4 font-medium">Date</th>
                                    <th className="py-2 pr-4 font-medium">Type</th>
                                    <th className="py-2 pr-4 text-right font-medium">Amount</th>
                                    <th className="py-2 text-right font-medium">Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx) => (
                                    <tr
                                        key={tx.id}
                                        className="border-b border-foreground/5 last:border-0"
                                    >
                                        <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground">
                                            {formatDate(tx.createdAt)}
                                        </td>
                                        <td className="py-2.5 pr-4">
                                            <Badge variant="secondary">{TYPE_LABEL[tx.type]}</Badge>
                                        </td>
                                        <td
                                            className={cn(
                                                'py-2.5 pr-4 text-right font-medium tabular-nums',
                                                tx.amount >= 0
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : 'text-rose-600 dark:text-rose-400',
                                            )}
                                        >
                                            {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                                        </td>
                                        <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                                            {tx.balanceAfter.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
