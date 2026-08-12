'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { authClient } from '@/shared/lib/auth/auth-client'

import { changePasswordFormSchema } from './change-password.schema'

type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>

export const useChangePasswordForm = () => {
    // Signing every other device out is the safer default when a password
    // changes — the user can opt out if they are just rotating a weak password.
    const [revokeOtherSessions, setRevokeOtherSessions] = useState(true)

    const form = useForm<ChangePasswordFormValues>({
        resolver: zodResolver(changePasswordFormSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmNewPassword: '',
        },
    })

    const onSubmit = async (formData: ChangePasswordFormValues) => {
        const { error } = await authClient.changePassword({
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword,
            revokeOtherSessions,
        })

        if (error) {
            // better-auth answers a wrong current password with 400; say which
            // field is wrong instead of showing a bare generic message.
            const message =
                error.status === 400
                    ? 'Current password is incorrect'
                    : error.message || 'Could not change password. Please try again.'

            if (error.status === 400) {
                form.setError('currentPassword', { message })
            } else {
                form.setError('root', { message })
            }

            toast.error(message)
            return
        }

        form.reset()
        toast.success(
            revokeOtherSessions
                ? 'Password changed. Other devices have been signed out.'
                : 'Password changed.',
        )
    }

    return {
        form,
        onSubmit,
        revokeOtherSessions,
        setRevokeOtherSessions,
    }
}
