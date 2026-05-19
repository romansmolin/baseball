import { z } from 'zod'

export const createUserSchema = z.object({
    email: z.email(),
    username: z.string().min(1),
    password: z.string().min(1),
    provider: z.string().min(1).optional(),
})

export const updateUserSchema = z
    .object({
        username: z.string().min(1).optional(),
        password: z.string().min(1).optional(),
        provider: z.string().min(1).optional(),
    })
    .refine((data) => data.username || data.password || data.provider, {
        message: 'No valid fields provided for update',
    })

export type CreateUserBody = z.infer<typeof createUserSchema>
export type UpdateUserBody = z.infer<typeof updateUserSchema>
