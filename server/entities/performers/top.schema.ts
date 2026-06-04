import { z } from 'zod'

export const topPerformersQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).optional(),
})

export type TopPerformersQuery = z.infer<typeof topPerformersQuerySchema>
