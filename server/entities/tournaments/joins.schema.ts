import { z } from 'zod'

export const joinTournamentSchema = z.object({
    fantasyTeamId: z.string().min(1, 'fantasyTeamId is required'),
})

export type JoinTournamentBody = z.infer<typeof joinTournamentSchema>
