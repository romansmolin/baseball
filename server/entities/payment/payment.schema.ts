import { z } from 'zod'

export const createCheckoutSchema = z.object({
    credits: z.number().int().positive(),
})

export type CreateCheckoutBody = z.infer<typeof createCheckoutSchema>
