'use client'

import { CheckmarkCircle02Icon, LockedIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

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
    const nextStep = steps.find((step) => step.status === 'next')

    if (compact) {
        if (steps.length > 0 && doneCount === steps.length) return null

        return (
            <details className="group/onboarding mb-6 border-b border-foreground/10 pb-6">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-x-5 gap-y-4 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0 flex-1 basis-56">
                        <h2 className="break-words text-sm font-semibold sm:text-base">Welcome to BaseballFantasy, {firstName}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">{isLoading && !data ? 'Loading your progress…' : error && !data ? 'Couldn’t load your progress. Open to try again.' : nextStep ? `Your next step: ${nextStep.title.toLowerCase()}.` : 'Complete these steps to join your first tournament.'}</p>
                    </div>
                    <div className="flex items-center gap-5 text-xs">
                        {steps.length > 0 && <div><span className="text-muted-foreground">{doneCount} of {steps.length} complete</span><div className="mt-2 flex gap-1" aria-hidden="true">{steps.map(step => <span key={step.id} className={cn('h-0.5 w-7 rounded-full', step.status === 'done' ? 'bg-primary' : 'bg-foreground/10')} />)}</div></div>}
                        <span className="inline-flex min-h-8 items-center gap-2 font-medium">View steps<ChevronDown aria-hidden="true" className="size-3.5 transition-transform group-open/onboarding:rotate-180" /></span>
                    </div>
                </summary>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                    {isLoading && !data ? [0, 1, 2].map(i => <OnboardingStepSkeleton key={i} />) : error && !data ? <button type="button" className="w-fit text-left text-sm text-primary hover:underline" onClick={() => mutate()}>Retry loading progress →</button> : steps.map(step => <OnboardingStepCard key={step.id} step={step} />)}
                </div>
            </details>
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

const OnboardingStepSkeleton = () => (
    <div className="flex flex-col gap-2 rounded-lg border border-foreground/10 bg-muted/30 p-4">
        <div className="size-8 animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
    </div>
)
