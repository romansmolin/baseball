import { z } from 'zod'

// A checkout is either a pack purchase (`credits` must match a pack) or a
// custom top-up (`amountCents` is what the user chose to spend, credits are
// derived server-side). Exactly one of the two must be present.
export const createCheckoutSchema = z
    .object({
        credits: z.number().int().positive().optional(),
        amountCents: z.number().int().positive().optional(),
    })
    .refine((body) => (body.credits == null) !== (body.amountCents == null), {
        message: 'Provide either credits (pack) or amountCents (custom amount)',
    })

export type CreateCheckoutBody = z.infer<typeof createCheckoutSchema>
