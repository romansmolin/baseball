import { CheckmarkCircle02Icon, LockedIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { cn } from '@/shared/utils'

import { onboardingSteps } from '../model/mock-data'
import type { OnboardingStep } from '../model/dashboard.type'

interface OnboardingChecklistProps {
    firstName: string
}

export const OnboardingChecklist = ({ firstName }: OnboardingChecklistProps) => {
    const doneCount = onboardingSteps.filter((s) => s.status === 'done').length

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-anton text-2xl tracking-wide">
                    Welcome to <span className="text-primary">BaseballFantasy</span>, {firstName}
                </CardTitle>
                <CardDescription>Complete these steps to play your first contest.</CardDescription>
                <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end text-right text-sm text-muted-foreground">
                    <span className="text-foreground">{doneCount}</span> of{' '}
                    {onboardingSteps.length} done
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3 md:grid-cols-3">
                    {onboardingSteps.map((step) => (
                        <OnboardingStepCard key={step.id} step={step} />
                    ))}
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
