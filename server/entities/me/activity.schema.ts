import { z } from 'zod'

export const activityQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).optional(),
})

export type ActivityQuery = z.infer<typeof activityQuerySchema>
