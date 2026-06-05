'use client'

import { useEffect, useState } from 'react'
import {
    Alert02Icon,
    CheckmarkCircle02Icon,
    Clock01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

import { buttonVariants } from '@/shared/ui/button'
import { cn } from '@/shared/utils'

type DisplayStatus = 'success' | 'pending' | 'failed'

interface PaymentStatusViewProps {
    initialStatus: DisplayStatus
    token: string | null
}

const POLL_INTERVAL_MS = 2000
const MAX_POLLS = 15

const COPY: Record<DisplayStatus, { title: string; description: string }> = {
    success: {
        title: 'Payment successful',
        description: 'Your credits have been added to your wallet.',
    },
    pending: {
        title: 'Payment processing',
        description: 'Hang tight — we’re confirming your payment. This usually takes a few seconds.',
    },
    failed: {
        title: 'Payment failed',
        description: 'Something went wrong and you were not charged. Please try again.',
    },
}

const toDisplayStatus = (raw: string): DisplayStatus => {
    if (raw === 'SUCCESSFUL') return 'success'
    if (raw === 'PENDING' || raw === 'CREATED') return 'pending'
    return 'failed'
}

export const PaymentStatusView = ({ initialStatus, token }: PaymentStatusViewProps) => {
    const [status, setStatus] = useState<DisplayStatus>(initialStatus)

    // Poll the payment-status endpoint while pending — the webhook that flips
    // the row to SUCCESSFUL lands asynchronously, so the return redirect can
    // arrive before the credits are granted.
    useEffect(() => {
        if (status !== 'pending' || !token) return

        let polls = 0
        let active = true

        const tick = async () => {
            if (!active) return
            polls += 1
            try {
                const res = await fetch(`/api/payments/secure-processor/${token}/status`)
                if (res.ok) {
                    const data: { status: string } = await res.json()
                    const next = toDisplayStatus(data.status)
                    if (next !== 'pending') {
                        setStatus(next)
                        return
                    }
                }
            } catch {
                // transient — keep polling until the cap
            }
            if (active && polls < MAX_POLLS) {
                window.setTimeout(tick, POLL_INTERVAL_MS)
            }
        }

        const id = window.setTimeout(tick, POLL_INTERVAL_MS)
        return () => {
            active = false
            window.clearTimeout(id)
        }
    }, [status, token])

    const copy = COPY[status]

    return (
        <main className="container mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center px-6 py-12 text-center">
            <span
                className={cn(
                    'flex size-16 items-center justify-center rounded-full',
                    status === 'success' && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                    status === 'pending' && 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                    status === 'failed' && 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
                )}
            >
                <HugeiconsIcon
                    icon={
                        status === 'success'
                            ? CheckmarkCircle02Icon
                            : status === 'pending'
                              ? Clock01Icon
                              : Alert02Icon
                    }
                    className={cn('size-8', status === 'pending' && 'animate-pulse')}
                />
            </span>

            <h1 className="mt-6 font-anton text-3xl tracking-wide">{copy.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>

            {token ? (
                <p className="mt-4 text-xs text-muted-foreground/70">
                    Reference: <span className="font-mono">{token}</span>
                </p>
            ) : null}

            <div className="mt-8 flex flex-col gap-2 sm:flex-row">
                <Link
                    href={`/wallet?payment=${status}`}
                    className={cn(buttonVariants({ variant: 'default' }))}
                >
                    Go to wallet
                </Link>
                <Link
                    href="/dashboard"
                    className={cn(buttonVariants({ variant: 'outline' }))}
                >
                    Back to dashboard
                </Link>
            </div>
        </main>
    )
}
