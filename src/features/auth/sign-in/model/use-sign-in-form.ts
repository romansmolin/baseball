'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { authClient } from '@/shared/lib/auth/auth-client'

import { signInFormSchema } from './sign-in.schema'

type SignInFormValues = z.infer<typeof signInFormSchema>

export const useSignInForm = () => {
    const form = useForm<SignInFormValues>({
        resolver: zodResolver(signInFormSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    })

    const onSubmit = async (formData: SignInFormValues) => {
        const { email, password } = formData

        const { error } = await authClient.signIn.email({
            email,
            password,
        })

        if (error) {
            const message = error.message || 'Invalid email or password. Please try again.'

            form.setError('root', { message })
            toast.error(message)
            return
        }

        window.location.href = '/dashboard'
    }

    return {
        form,
        onSubmit,
    }
}
