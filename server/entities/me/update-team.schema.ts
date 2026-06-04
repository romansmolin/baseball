import { z } from 'zod'

export const updateTeamSchema = z.object({
    name: z.string().trim().min(1, 'Team name cannot be empty').max(60),
})

export type UpdateTeamBody = z.infer<typeof updateTeamSchema>
