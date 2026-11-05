import { prisma } from '../../../../../../server/lib/prisma'
import { isAuthorizedCron } from '../../../../../../server/shared/cron-auth.utils'
import { cleanupShowcase } from '../../../../../../server/services/showcase/showcase-cleanup'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    if (!isAuthorizedCron(request)) return Response.json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } }, { status: 401 })
    try { return Response.json(await cleanupShowcase(prisma)) }
    catch { return Response.json({ error: { code: 'INTERNAL_ERROR', message: 'Showcase cleanup failed' } }, { status: 500 }) }
}
