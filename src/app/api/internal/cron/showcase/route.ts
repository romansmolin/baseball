import { prisma } from '../../../../../../server/lib/prisma'
import { isAuthorizedCron } from '../../../../../../server/shared/cron-auth.utils'
import { parseShowcaseJobs, tickShowcase } from '../../../../../../server/services/showcase/showcase-runner'
export const maxDuration = 60
export async function GET(request: Request) {
    if (!isAuthorizedCron(request)) return Response.json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } }, { status: 401 })
    const jobs = parseShowcaseJobs(new URL(request.url).searchParams.get('job'))
    if (!jobs) return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Unknown showcase job' } }, { status: 400 })
    try { return Response.json(await tickShowcase(prisma, { jobs })) }
    catch { return Response.json({ error: { code: 'INTERNAL_ERROR', message: 'Showcase update failed' } }, { status: 500 }) }
}
