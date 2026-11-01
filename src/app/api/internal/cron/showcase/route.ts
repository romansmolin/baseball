import { prisma } from '../../../../../../server/lib/prisma'
import { isAuthorizedCron } from '../../../../../../server/shared/cron-auth.utils'
import { tickShowcase } from '../../../../../../server/services/showcase/showcase-runner'
export const maxDuration = 60
export async function GET(request: Request) {
    if (!isAuthorizedCron(request)) return Response.json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } }, { status: 401 })
    try { return Response.json(await tickShowcase(prisma)) }
    catch { return Response.json({ error: { code: 'INTERNAL_ERROR', message: 'Showcase update failed' } }, { status: 500 }) }
}
