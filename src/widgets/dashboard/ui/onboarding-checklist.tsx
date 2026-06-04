'use client'

import { CheckmarkCircle02Icon, LockedIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { useOnboardingData } from '@/entities/dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import type { OnboardingStep } from '@/shared/dashboard'
import { cn } from '@/shared/utils'

interface OnboardingChecklistProps {
    firstName: string
}

export const OnboardingChecklist = ({ firstName }: OnboardingChecklistProps) => {
    const { data, error, isLoading } = useOnboardingData()
    const steps = data ?? []
    const doneCount = steps.filter((s) => s.status === 'done').length

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-anton text-2xl tracking-wide">
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
                <div className="grid gap-3 md:grid-cols-3">
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
