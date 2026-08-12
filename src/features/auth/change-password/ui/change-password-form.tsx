'use client'

import { LoaderCircle, LockPasswordIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'

import { useChangePasswordForm } from '../model/use-change-password-form'

export const ChangePasswordForm = () => {
    const { onSubmit, form, revokeOtherSessions, setRevokeOtherSessions } = useChangePasswordForm()

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = form

    return (
        <form id="change-password-form" onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
                <Field data-invalid={!!errors.currentPassword}>
                    <FieldLabel htmlFor="current-password">Current password</FieldLabel>
                    <Input
                        id="current-password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="Enter your current password"
                        {...register('currentPassword')}
                    />
                    <FieldError errors={[errors.currentPassword]} />
                </Field>

                <Field data-invalid={!!errors.newPassword}>
                    <FieldLabel htmlFor="new-password">New password</FieldLabel>
                    <Input
                        id="new-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Enter your new password"
                        {...register('newPassword')}
                    />
                    <FieldError errors={[errors.newPassword]} />
                </Field>

                <Field data-invalid={!!errors.confirmNewPassword}>
                    <FieldLabel htmlFor="confirm-new-password">Confirm new password</FieldLabel>
                    <Input
                        id="confirm-new-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Repeat your new password"
                        {...register('confirmNewPassword')}
                    />
                    <FieldError errors={[errors.confirmNewPassword]} />
                </Field>

                <Field orientation="horizontal">
                    <Checkbox
                        id="revoke-other-sessions"
                        checked={revokeOtherSessions}
                        onCheckedChange={(checked) => setRevokeOtherSessions(!!checked)}
                    />
                    <FieldLabel htmlFor="revoke-other-sessions" className="font-normal">
                        Sign out my other devices
                    </FieldLabel>
                </Field>

                {errors.root?.message && (
                    <Field data-invalid>
                        <FieldError errors={[errors.root]} />
                    </Field>
                )}

                <Button type="submit" disabled={isSubmitting} className="sm:self-start">
                    {isSubmitting ? (
                        <div className="flex items-center gap-2">
                            <HugeiconsIcon icon={LoaderCircle} className="animate-spin" />
                            Updating…
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <HugeiconsIcon icon={LockPasswordIcon} />
                            Change password
                        </div>
                    )}
                </Button>
            </FieldGroup>
        </form>
    )
}
