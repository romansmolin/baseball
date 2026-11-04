'use client'

import { CheckmarkCircle02Icon, LockedIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'
import { Check } from 'lucide-react'

import { useOnboardingData } from '@/entities/dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import type { OnboardingStep } from '@/shared/dashboard'
import { cn } from '@/shared/utils'

interface OnboardingChecklistProps {
    firstName: string
    compact?: boolean
}

export const OnboardingChecklist = ({ firstName, compact = false }: OnboardingChecklistProps) => {
    const { data, error, isLoading, mutate } = useOnboardingData()
    const steps = data ?? []
    const doneCount = steps.filter((s) => s.status === 'done').length

    if (compact) {
        if (steps.length > 0 && doneCount === steps.length) return null

        return (
            <section aria-labelledby="get-started-title" className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-baseline justify-between gap-3">
                    <h2 id="get-started-title" className="text-base font-semibold">Get started</h2>
                    {steps.length > 0 && <p className="text-sm text-muted-foreground">{doneCount} of {steps.length} done</p>}
                </div>
                {isLoading && !data ? <div className="mt-4 space-y-3" role="status" aria-label="Loading your progress">{[0, 1, 2].map(i => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}</div>
                    : error && !data ? <button type="button" className="mt-3 text-sm font-medium text-primary hover:underline" onClick={() => mutate()}>We couldn’t load your progress. Try again</button>
                    : <ol className="mt-4 space-y-4">{steps.map(step => <OnboardingStepRow key={step.id} step={step} />)}</ol>}
            </section>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className={cn("font-anton tracking-wide", compact ? "text-lg" : "text-2xl")}>
                    Welcome to <span className="text-primary">BaseballFantasy</span>, {firstName}
                </CardTitle>
                <CardDescription>Complete these steps to join your first tournament.</CardDescription>
                <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end text-right text-sm text-muted-foreground">
                    {isLoading ? (
                        'Loading…'
                    ) : error ? (
                        'Couldn’t load progress'
                    ) : (
                        <>
                            <span className="text-foreground">{doneCount}</span> of {steps.length}{' '}
                            done
                        </>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className={cn("grid gap-3 md:grid-cols-3", compact && "[&>div]:p-3 [&>div>div:first-child]:hidden")}>
                    {isLoading
                        ? [0, 1, 2].map((i) => <OnboardingStepSkeleton key={i} />)
                        : steps.map((step) => <OnboardingStepCard key={step.id} step={step} />)}
                </div>
            </CardContent>
        </Card>
    )
}

const OnboardingStepCard = ({ step }: { step: OnboardingStep }) => {
    const isDone = step.status === 'done'
    const isNext = step.status === 'next'
    const isLocked = step.status === 'locked'

    return (
        <div
            className={cn(
                'flex flex-col gap-2 rounded-lg border p-4 transition-colors',
                isDone && 'border-primary/30 bg-primary/5',
                isNext && 'border-primary/50 bg-primary/10',
                isLocked && 'border-foreground/10 bg-muted/30',
            )}
        >
            <div
                className={cn(
                    'flex size-8 items-center justify-center rounded-full text-sm font-semibold',
                    isDone && 'bg-primary text-primary-foreground',
                    isNext && 'bg-primary text-primary-foreground',
                    isLocked && 'bg-muted text-muted-foreground',
                )}
            >
                {isDone ? (
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-5" />
                ) : isLocked ? (
                    <HugeiconsIcon icon={LockedIcon} className="size-4" />
                ) : (
                    step.index
                )}
            </div>
            <div className="font-medium">{step.title}</div>
            <div className="text-xs text-muted-foreground">{step.description}</div>
            {isNext && step.id === 'team' && <Link href="/teams/new" className="mt-1 text-xs font-medium text-primary hover:underline">Create a team →</Link>}
            {isNext && step.id === 'tournament' && <Link href="/tournaments" className="mt-1 text-xs font-medium text-primary hover:underline">Explore tournaments →</Link>}
        </div>
    )
}

const OnboardingStepRow = ({ step }: { step: OnboardingStep }) => {
    const isDone = step.status === 'done'
    const isNext = step.status === 'next'

    return (
        <li className="flex gap-3">
            <span className={cn(
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                isDone && 'bg-primary text-primary-foreground',
                isNext && 'border-2 border-primary text-primary',
                step.status === 'locked' && 'bg-muted text-muted-foreground',
            )}>
                {isDone ? <Check className="size-3.5" aria-hidden="true" /> : step.index}
            </span>
            <span className="min-w-0">
                <span className={cn('block text-sm font-medium', step.status === 'locked' && 'text-muted-foreground')}>{step.title}</span>
                {!isDone && <span className="mt-0.5 block text-sm text-muted-foreground">{step.description}</span>}
                {isNext && step.id === 'team' && <Link href="/teams/new" className="mt-1 inline-block text-sm font-medium text-primary hover:underline">Create a team</Link>}
                {isNext && step.id === 'tournament' && <Link href="/tournaments" className="mt-1 inline-block text-sm font-medium text-primary hover:underline">Explore tournaments</Link>}
            </span>
        </li>
    )
}

const OnboardingStepSkeleton = () => (
    <div className="flex flex-col gap-2 rounded-lg border border-foreground/10 bg-muted/30 p-4">
        <div className="size-8 animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
    </div>
)
