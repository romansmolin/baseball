// Tournament lifecycle cron: flips League.status based on the wall clock.
//   - DRAFTING  → IN_SEASON   once startsAt <= now
//   - IN_SEASON → COMPLETED   once endsAt  <= now
// Fast (single SQL pass), idempotent, safe to run as often as the plan allows.
// PLAYOFFS / ARCHIVED transitions are out of scope (manual for now).

import { ApiError } from '../../../../../../server/errors/api.error'
import { prisma } from '../../../../../../server/lib/prisma'
import { isAuthorizedCron } from '../../../../../../server/shared/cron-auth.utils'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    if (!isAuthorizedCron(request)) {
        return ApiError.unauthorized().toResponse()
    }

    const now = new Date()

    const draftingToInSeason = await prisma.league.updateMany({
        where: { status: 'DRAFTING', startsAt: { lte: now } },
        data: { status: 'IN_SEASON' },
    })

    const inSeasonToCompleted = await prisma.league.updateMany({
        where: { status: 'IN_SEASON', endsAt: { lte: now } },
        data: { status: 'COMPLETED' },
    })

    return Response.json({
        transitionedToInSeason: draftingToInSeason.count,
        transitionedToCompleted: inSeasonToCompleted.count,
        runAtUtc: now.toISOString(),
    })
}
