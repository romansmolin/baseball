'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

import { useAdminUserLookup } from '../model/use-admin-user-lookup'

const formatDateTime = (iso: string) => new Date(iso).toLocaleString()

const formatMoney = (amountCents: number, currency: string) =>
    new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format(amountCents / 100)

const empty = (text: string) => <p className="py-4 text-center text-sm text-muted-foreground">{text}</p>

export const AdminUserLookup = () => {
    const { email, setEmail, activity, isSearching, isGeneratingReport, search, downloadReport } =
        useAdminUserLookup()

    const [pendingReceipt, setPendingReceipt] = useState<string | null>(null)
    const receipt = async (id: string, format: 'api' | 'pdf') => {
        setPendingReceipt(`${format}:${id}`)
        try {
            const response = await fetch('/api/admin/receipts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentTokenId: id, format }) })
            const result = await response.json()
            if (!response.ok) throw new Error(result.error?.message ?? 'Could not generate receipt')
            if (result.file) {
                const link = document.createElement('a')
                link.href = `data:${result.file.contentType};base64,${result.file.base64}`
                link.download = `receipt-${result.receiptId}.pdf`
                link.click()
            }
            toast.success(`Receipt ${result.receiptId} generated`)
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not generate receipt') }
        finally { setPendingReceipt(null) }
    }

    return (
        <div className="space-y-6">
            <form onSubmit={search} className="flex max-w-xl items-end gap-3">
                <div className="flex-1 space-y-2">
                    <Label htmlFor="admin-user-email">User email</Label>
                    <Input
                        id="admin-user-email"
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                </div>
                <Button type="submit" disabled={isSearching}>
                    {isSearching ? 'Searching…' : 'Search'}
                </Button>
            </form>

            {activity && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>{activity.user.name}</CardTitle>
                            <CardDescription>{activity.user.email}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm">
                                Balance: {activity.balance} credits · Joined {formatDateTime(activity.user.createdAt)}
                            </p>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">{activity.user.role}</Badge>
                                <Badge variant="outline">{activity.user.status}</Badge>
                                <Button variant="outline" size="sm" disabled={isGeneratingReport} onClick={downloadReport}>
                                    {isGeneratingReport ? 'Generating…' : 'Generate report'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-base">AI activity history</CardTitle><CardDescription>Consecutive uses of the same feature within 30 minutes are grouped.</CardDescription></CardHeader>
                        <CardContent>{activity.batches.length === 0 ? empty('No activity yet') : <ul className="divide-y">{activity.batches.map((batch) => <li key={batch.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><div><p className="font-medium">{batch.count} × {batch.style.replaceAll('_', ' ')}</p><p className="text-xs text-muted-foreground">{formatDateTime(batch.startedAt)} – {formatDateTime(batch.endedAt)}</p></div><p className="text-xs text-muted-foreground">{batch.completed} completed · {batch.failed} failed · {batch.credits} credits</p></li>)}</ul>}</CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Payments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {activity.payments.length === 0 ? (
                                empty('No payments yet')
                            ) : (
                                <ul className="divide-y">
                                    {activity.payments.map((payment) => (
                                        <li key={payment.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                                            <div>
                                                <p className="font-medium">
                                                    {formatMoney(payment.amountCents, payment.currency)} · {payment.creditAmount} credits
                                                </p>
                                                <p className="text-xs text-muted-foreground">{formatDateTime(payment.createdAt)}</p>
                                            </div>
                                            <div className="flex items-center gap-2"><Badge variant="outline">{payment.status}</Badge>{payment.status === 'SUCCESSFUL' && <><Button variant="outline" size="sm" disabled={pendingReceipt !== null} onClick={() => receipt(payment.id, 'api')}>{pendingReceipt === `api:${payment.id}` ? 'Generating…' : 'Generate receipt'}</Button><Button variant="outline" size="sm" disabled={pendingReceipt !== null} onClick={() => receipt(payment.id, 'pdf')}>{pendingReceipt === `pdf:${payment.id}` ? 'Generating…' : 'Receipt PDF'}</Button></>}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Credit transactions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {activity.transactions.length === 0 ? (
                                empty('No transactions yet')
                            ) : (
                                <ul className="divide-y">
                                    {activity.transactions.map((tx) => (
                                        <li key={tx.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                                            <div>
                                                <p className="font-medium">{tx.type}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDateTime(tx.createdAt)} · {tx.status.toLowerCase()}
                                                </p>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {tx.amount > 0 ? '+' : ''}
                                                {tx.amount} → {tx.balanceAfter}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Teams</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {activity.teams.length === 0 ? (
                                empty('No teams yet')
                            ) : (
                                <ul className="divide-y">
                                    {activity.teams.map((team) => (
                                        <li key={team.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                                            <p className="font-medium">{team.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {team.leagueSlug} · {team.format} · {formatDateTime(team.createdAt)}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
