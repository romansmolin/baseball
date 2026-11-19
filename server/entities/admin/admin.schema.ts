import { z } from 'zod'

export const userLookupSchema = z.object({
    email: z.email('A valid email is required'),
})
export type UserLookupBody = z.infer<typeof userLookupSchema>
