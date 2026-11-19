'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import {
    MAX_DEMO_PAYMENT_ROWS,
    generateDemoActivity,
    maxDemoLastDate,
    type DemoActivityRow,
    type DemoPaymentRow,
} from '../model/demo-data'
import { GenericCard } from './generic-card'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { generateDemoReport } from '../api/client/services/demo-report.service'
import { createPaymentDrafts, PAYMENT_STATUSES, type PaymentDraft } from '../model/payment-drafts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

const DEFAULT_FORM = { email: '', firstDate: '', lastDate: '', tokens: '', paymentRows: '' }
const ACTIVITY_PAGE_SIZE = 20

type FormKey = keyof typeof DEFAULT_FORM

const errorMessage = (error: unknown) =>
    (axios.isAxiosError(error) && error.response?.data?.error?.message) ||
    (error instanceof Error ? error.message : 'Something went wrong')

const headCell = 'py-2 pr-4 font-medium'

const paymentStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
        case 'successful':
            return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
        case 'pending':
        case 'created':
            return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200'
        case 'failed':
        case 'declined':
        case 'error':
            return 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200'
        default:
            return 'border-border bg-muted text-muted-foreground'
    }
}

export const DemoGenerator = () => {
    const [form, setForm] = useState(DEFAULT_FORM)
    const [activity, setActivity] = useState<DemoActivityRow[] | null>(null)
    const [activityPage, setActivityPage] = useState(1)
    const [payments, setPayments] = useState<DemoPaymentRow[] | null>(null)
    const [paymentDrafts, setPaymentDrafts] = useState<PaymentDraft[] | null>(null)
    const [isDownloading, setIsDownloading] = useState(false)
    const abortRef = useRef<AbortController | null>(null)

    // Stop polling when the page is left.
    useEffect(() => () => abortRef.current?.abort(), [])

    const field = (key: FormKey) => ({
        value: form[key],
        onChange: (event: { target: { value: string } }) =>
            setForm((current) => ({ ...current, [key]: event.target.value })),
    })

    const handleGenerate = (event: FormEvent) => {
        event.preventDefault()
        try {
            setActivity(
                generateDemoActivity({
                    firstDate: form.firstDate,
                    lastDate: form.lastDate,
                    tokens: Number(form.tokens),
                }),
            )
            setActivityPage(1)
        } catch (error) {
            toast.error(errorMessage(error))
        }
    }

    const handleGeneratePaymentRows = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const count = Number(form.paymentRows)
        if (!Number.isInteger(count) || count < 1 || count > MAX_DEMO_PAYMENT_ROWS) {
            toast.error(`Rows count must be between 1 and ${MAX_DEMO_PAYMENT_ROWS}`)
            return
        }
        const date = form.firstDate || new Date().toLocaleDateString('en-CA')
        setPaymentDrafts(
            createPaymentDrafts(
                count,
                date,
                () => `gen_${crypto.randomUUID().replaceAll('-', '')}`,
            ),
        )
        setPayments(null)
    }

    const handleReset = () => {
        abortRef.current?.abort()
        setIsDownloading(false)
        setForm((current) => ({ ...DEFAULT_FORM, paymentRows: current.paymentRows }))
        setActivity(null)
        setActivityPage(1)
    }

    const updatePaymentDraft = (
        index: number,
        key: keyof Omit<PaymentDraft, 'id'>,
        value: string,
    ) => {
        setPaymentDrafts(
            (drafts) =>
                drafts?.map((draft, i) => (i === index ? { ...draft, [key]: value } : draft)) ??
                null,
        )
        setPayments(null)
    }

    const handleCreatePaymentTable = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!paymentDrafts) return
        const rows = paymentDrafts.map((draft) => {
            const [year, month, day] = draft.date.split('-')
            return {
                id: draft.id,
                date: `${day}.${month}.${year}`,
                amountCents: Math.round(Number(draft.amount) * 100),
                currency: draft.currency.trim().toUpperCase(),
                tokens: Number(draft.tokens),
                status: draft.status.trim(),
            }
        })
        if (
            rows.some(
                (row) =>
                    !Number.isSafeInteger(row.amountCents) ||
                    row.amountCents <= 0 ||
                    !Number.isFinite(row.tokens) ||
                    row.tokens <= 0 ||
                    !/^[A-Z]{3}$/.test(row.currency) ||
                    !row.status,
            )
        ) {
            toast.error(
                'Enter a positive amount and token count, a three-letter currency, and a status for each payment',
            )
            return
        }
        setPayments(rows)
    }

    const handleDownload = async () => {
        if (!form.email || !form.firstDate || !form.lastDate) {
            toast.error('Enter an email and date range to download the report')
            return
        }
        const controller = new AbortController()
        abortRef.current = controller
        setIsDownloading(true)
        try {
            const base64 = await generateDemoReport(
                {
                    email: form.email,
                    period: `${form.firstDate} - ${form.lastDate}`,
                    activity,
                    payments,
                },
                controller.signal,
            )
            const link = document.createElement('a')
            link.href = `data:application/pdf;base64,${base64}`
            link.download = 'report.pdf'
            link.click()
        } catch (error) {
            if (!controller.signal.aborted) toast.error(errorMessage(error))
        } finally {
            if (!controller.signal.aborted) setIsDownloading(false)
        }
    }

    return (
        <section className="space-y-6" data-testid="demo-generator">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Activity configuration</CardTitle>
                    <CardDescription>
                        Generate demo activity over a period of up to 6 months. These records are
                        simulated.
                    </CardDescription>
                    <CardAction>
                        <Button
                            data-testid="demo-download"
                            disabled={isDownloading || !(activity || payments)}
                            onClick={handleDownload}
                        >
                            {isDownloading ? 'Generating report…' : 'Download PDF'}
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleGenerate} className="grid gap-4 md:grid-cols-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="demo-email">Email</Label>
                            <Input
                                id="demo-email"
                                data-testid="demo-email"
                                type="email"
                                required
                                {...field('email')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="demo-first-date">First date</Label>
                            <Input
                                id="demo-first-date"
                                data-testid="demo-first-date"
                                type="date"
                                required
                                {...field('firstDate')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="demo-last-date">Last date</Label>
                            <Input
                                id="demo-last-date"
                                data-testid="demo-last-date"
                                type="date"
                                required
                                min={form.firstDate || undefined}
                                max={maxDemoLastDate(form.firstDate)}
                                {...field('lastDate')}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="demo-tokens">Tokens spend</Label>
                            <Input
                                id="demo-tokens"
                                data-testid="demo-tokens"
                                type="number"
                                min={100}
                                step={100}
                                required
                                {...field('tokens')}
                            />
                        </div>
                        <div className="flex gap-3 md:col-span-4">
                            <Button type="submit" data-testid="demo-generate">
                                Generate activity
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                data-testid="demo-reset"
                                onClick={handleReset}
                            >
                                Reset
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Payment configuration</CardTitle>
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={handleGeneratePaymentRows}
                        className="flex flex-wrap items-end gap-3"
                    >
                        <div className="space-y-2">
                            <Label htmlFor="demo-payment-rows">Rows count</Label>
                            <Input
                                id="demo-payment-rows"
                                data-testid="demo-payment-rows"
                                type="number"
                                min={1}
                                max={MAX_DEMO_PAYMENT_ROWS}
                                step={1}
                                required
                                {...field('paymentRows')}
                            />
                        </div>
                        <Button type="submit" data-testid="generate-payment-rows">
                            Generate rows
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {activity && (
                <GenericCard
                    cardTitle="AI activity"
                    cardDescripiton={`${activity.length} generations · ${activity[0]?.totalSpent} tokens`}
                    cardContent={
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm" data-testid="demo-activity-table">
                                <thead>
                                    <tr className="border-b text-left text-muted-foreground">
                                        <th className={headCell}>#</th>
                                        <th className={headCell}>Date</th>
                                        <th className={headCell}>Time</th>
                                        <th className={headCell}>Type</th>
                                        <th className={`${headCell} text-center`}>Tokens</th>
                                        <th className={headCell}>Status</th>
                                        <th className="py-2 text-right font-medium">Total spent</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activity
                                        .slice(
                                            (activityPage - 1) * ACTIVITY_PAGE_SIZE,
                                            activityPage * ACTIVITY_PAGE_SIZE,
                                        )
                                        .map((row) => (
                                            <tr key={row.index} className="border-b last:border-0">
                                                <td className="py-2 pr-4">{row.index}</td>
                                                <td className="py-2 pr-4">{row.date}</td>
                                                <td className="py-2 pr-4">{row.time}</td>
                                                <td className="py-2 pr-4">{row.type}</td>
                                                <td className="py-2 pr-4 text-center">
                                                    {row.tokens}
                                                </td>
                                                <td className="py-2 pr-4">
                                                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td className="py-2 text-right font-medium">
                                                    {row.totalSpent}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                            {activity.length > ACTIVITY_PAGE_SIZE && (
                                <nav
                                    aria-label="Generation pages"
                                    className="mt-4 flex items-center justify-end gap-3"
                                >
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={activityPage === 1}
                                        onClick={() => setActivityPage((page) => page - 1)}
                                    >
                                        Previous
                                    </Button>
                                    <span className="text-sm" aria-live="polite">
                                        Page {activityPage} of{' '}
                                        {Math.ceil(activity.length / ACTIVITY_PAGE_SIZE)}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={
                                            activityPage >=
                                            Math.ceil(activity.length / ACTIVITY_PAGE_SIZE)
                                        }
                                        onClick={() => setActivityPage((page) => page + 1)}
                                    >
                                        Next
                                    </Button>
                                </nav>
                            )}
                        </div>
                    }
                />
            )}

            {paymentDrafts && (
                <Card>
                    <CardHeader>
                        <CardTitle>Payment details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreatePaymentTable}>
                            <div className="overflow-x-auto">
                                <table
                                    className="w-full min-w-[850px] table-fixed text-sm"
                                    data-testid="payment-input-table"
                                >
                                    <colgroup>
                                        <col className="w-36" />
                                        <col className="w-44" />
                                        <col className="w-32" />
                                        <col className="w-28" />
                                        <col className="w-32" />
                                        <col className="w-44" />
                                    </colgroup>
                                    <thead>
                                        <tr className="text-left text-muted-foreground">
                                            <th className={headCell}>ID</th>
                                            <th className={headCell}>Date</th>
                                            <th className={headCell}>Amount</th>
                                            <th className={headCell}>Currency</th>
                                            <th className={headCell}>Tokens</th>
                                            <th className={headCell}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paymentDrafts.map((draft, index) => (
                                            <tr key={draft.id}>
                                                <td className="py-2 pr-4">
                                                    <span
                                                        className="block truncate font-mono text-xs"
                                                        title={draft.id}
                                                    >
                                                        {draft.id}
                                                    </span>
                                                </td>
                                                <td className="py-2 pr-4">
                                                    <Input
                                                        aria-label={`Date ${index + 1}`}
                                                        type="date"
                                                        required
                                                        value={draft.date}
                                                        onChange={(e) =>
                                                            updatePaymentDraft(
                                                                index,
                                                                'date',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </td>
                                                <td className="py-2 pr-4">
                                                    <Input
                                                        aria-label={`Amount ${index + 1}`}
                                                        type="number"
                                                        min="0.01"
                                                        step="0.01"
                                                        required
                                                        value={draft.amount}
                                                        onChange={(e) =>
                                                            updatePaymentDraft(
                                                                index,
                                                                'amount',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </td>
                                                <td className="py-2 pr-4">
                                                    <Input
                                                        aria-label={`Currency ${index + 1}`}
                                                        minLength={3}
                                                        maxLength={3}
                                                        required
                                                        value={draft.currency}
                                                        onChange={(e) =>
                                                            updatePaymentDraft(
                                                                index,
                                                                'currency',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </td>
                                                <td className="py-2 pr-4">
                                                    <Input
                                                        aria-label={`Tokens ${index + 1}`}
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        required
                                                        value={draft.tokens}
                                                        onChange={(e) =>
                                                            updatePaymentDraft(
                                                                index,
                                                                'tokens',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </td>
                                                <td className="py-2 pr-4">
                                                    <Select
                                                        items={PAYMENT_STATUSES.map((status) => ({
                                                            value: status,
                                                            label: status,
                                                        }))}
                                                        value={draft.status || null}
                                                        onValueChange={(value) => {
                                                            if (value)
                                                                updatePaymentDraft(
                                                                    index,
                                                                    'status',
                                                                    value,
                                                                )
                                                        }}
                                                    >
                                                        <SelectTrigger
                                                            aria-label={`Status ${index + 1}`}
                                                            className="w-full min-w-32"
                                                        >
                                                            <SelectValue placeholder="Select status" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {PAYMENT_STATUSES.map((status) => (
                                                                <SelectItem
                                                                    key={status}
                                                                    value={status}
                                                                >
                                                                    {status}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Button type="submit" className="mt-4">
                                Create table
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {payments && (
                <Card className="gap-0 py-0">
                    <CardHeader className="gap-1.5 px-6 py-6">
                        <CardTitle className="text-lg font-semibold">
                            Payment History <span className="text-muted-foreground">—</span>{' '}
                            <span className="text-emerald-800 dark:text-emerald-300">
                                {payments.length} {payments.length === 1 ? 'record' : 'records'}
                            </span>
                        </CardTitle>
                        <CardDescription>Simulated payment records entered above</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto px-0">
                        <table
                            className="w-full min-w-[820px] text-left text-sm"
                            data-testid="demo-payments-table"
                        >
                            <thead className="border-y border-border bg-muted/60 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                <tr>
                                    <th scope="col" className="px-6 py-4">
                                        ID
                                    </th>
                                    <th scope="col" className="px-5 py-4">
                                        Date
                                    </th>
                                    <th scope="col" className="px-5 py-4">
                                        Amount
                                    </th>
                                    <th scope="col" className="px-5 py-4">
                                        Currency
                                    </th>
                                    <th scope="col" className="px-5 py-4">
                                        Tokens
                                    </th>
                                    <th scope="col" className="px-5 py-4">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {payments.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="transition-colors hover:bg-muted/40"
                                    >
                                        <td className="whitespace-nowrap px-6 py-5 font-mono text-xs text-muted-foreground">
                                            {row.id}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-5 font-medium tabular-nums">
                                            {row.date}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-5 font-medium tabular-nums">
                                            {(row.amountCents / 100).toFixed(2)}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-5">
                                            {row.currency}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-5 tabular-nums">
                                            {row.tokens}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-5">
                                            <Badge
                                                variant="outline"
                                                className={`h-auto px-2.5 py-1 ${paymentStatusClass(
                                                    row.status,
                                                )}`}
                                            >
                                                {row.status}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}
        </section>
    )
}
