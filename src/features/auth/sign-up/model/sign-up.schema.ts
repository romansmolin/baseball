import { z } from 'zod'

import { isAtLeastAge, MIN_AGE } from '@/shared/utils'

export const signUpFormSchema = z
    .object({
        email: z
            .email()
            .min(3, 'The minimal email lenght is 3 symbols')
            .max(60, 'The maximal email length is 60 symbols'),
        username: z
            .string()
            .min(5, 'The minimal username lenght is 5 symbols')
            .max(50, 'The maximal username lengths is 50 symbols'),
        password: z
            .string()
            .min(8, { message: 'Password must be at least 8 characters long' })
            .max(20, { message: 'Password cannot exceed 20 characters' })
            .refine((val) => /[A-Z]/.test(val), {
                message: 'Password must contain at least one uppercase letter',
            })
            .refine((val) => /[a-z]/.test(val), {
                message: 'Password must contain at least one lowercase letter',
            })
            .refine((val) => /[0-9]/.test(val), {
                message: 'Password must contain at least one number',
            })
            .refine((val) => /[!@#$%^&*]/.test(val), {
                message: 'Password must contain at least one special character',
            }),
        confirmPassword: z.string(),
        dateOfBirth: z
            .string()
            .min(1, 'Date of birth is required')
            .refine((val) => {
                const d = new Date(val)
                return !Number.isNaN(d.getTime()) && d <= new Date() && d.getFullYear() >= 1900
            }, 'Enter a valid date of birth')
            .refine(
                (val) => isAtLeastAge(val),
                `You must be at least ${MIN_AGE} years old to create an account`,
            ),
        countryOfResidence: z.string().length(2, 'Country of residence is required'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'], // Sets the error to the confirmPassword field
    })
