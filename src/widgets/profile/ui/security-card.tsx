import { ShieldKeyIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { ChangePasswordForm } from '@/features/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

interface SecurityCardProps {
    // False for accounts created through a social provider: there is no
    // password to change, so we explain that instead of showing a form that
    // can only fail.
    hasPassword: boolean
}

export const SecurityCard = ({ hasPassword }: SecurityCardProps) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex size-8 items-center justify-center rounded-xl bg-foreground/5 text-muted-foreground">
                    <HugeiconsIcon icon={ShieldKeyIcon} className="size-4" />
                </span>
                Password
            </CardTitle>
            <CardDescription>
                {hasPassword
                    ? 'Change the password you use to sign in.'
                    : 'Your account signs in through a connected provider, so it has no password to change.'}
            </CardDescription>
        </CardHeader>
        {hasPassword && (
            <CardContent>
                <ChangePasswordForm />
            </CardContent>
        )}
    </Card>
)
