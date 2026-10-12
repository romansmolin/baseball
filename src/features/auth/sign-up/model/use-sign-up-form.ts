'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { authClient } from '@/shared/lib/auth/auth-client'

import { signUpFormSchema } from './sign-up.schema'

type SignUpFormValues = z.infer<typeof signUpFormSchema>

export const useSignUpForm = () => {
    const [agreeToTerms, setAgreeToTerms] = useState(false)
    const [confirmAge, setConfirmAge] = useState(false)

    const form = useForm<SignUpFormValues>({
        resolver: zodResolver(signUpFormSchema),
        defaultValues: {
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
            dateOfBirth: '',
            countryOfResidence: '',
        },
    })

    const onSubmit = async (formData: SignUpFormValues) => {
        const { username, email, password, dateOfBirth, countryOfResidence } = formData

        const { error } = await authClient.signUp.email({
            name: username,
            email,
            password,
            dateOfBirth,
            countryOfResidence,
        })

        if (error) {
            const message = error.message || 'Something went wrong! Please try again.'

            form.setError('root', { message })
            toast.error(message)
            return
        }

        window.location.href = '/dashboard'
    }

    return {
        form,
        agreeToTerms,
        confirmAge,
        onSubmit,
        setAgreeToTerms,
        setConfirmAge,
    }
}
