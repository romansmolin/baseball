import type { Prisma } from '../../../src/generated/prisma/client'

export type FantasyTeamWithRoster = Prisma.FantasyTeamGetPayload<{
    include: { rosterSlots: true }
}>
