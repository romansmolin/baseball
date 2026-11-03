import { ApiError } from '../../../../../../server/errors/api.error'
import { DailyContestsRepository } from '../../../../../../server/repositories/daily-contests/daily-contests.repository'
import { showcaseEnabled } from '../../../../../../server/shared/showcase-config'
import { getAuthenticatedUser } from '../../../../../../server/shared/auth.utils'

export const dynamic = 'force-dynamic'

export async function GET() {
    if (!showcaseEnabled()) return Response.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 })
    const user = await getAuthenticatedUser()
    if (!user) return ApiError.unauthorized().toResponse()
    const items = await new DailyContestsRepository().myActiveEntries(user.id)
    return Response.json({ items }, { headers: { 'Cache-Control': 'no-store' } })
}
