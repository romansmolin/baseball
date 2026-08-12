import { z } from 'zod'

// Same strength rules as sign-up — a password changed here must still be a
// password the registration form would have accepted.
const passwordRules = z
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
    })

export const changePasswordFormSchema = z
    .object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: passwordRules,
        confirmNewPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
        message: "Passwords don't match",
        path: ['confirmNewPassword'],
    })
    .refine((data) => data.newPassword !== data.currentPassword, {
        message: 'New password must differ from the current one',
        path: ['newPassword'],
    })
