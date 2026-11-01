import { prisma } from '../../../../../../server/lib/prisma'
import { getAuthenticatedUser } from '../../../../../../server/shared/auth.utils'
import { tickShowcase } from '../../../../../../server/services/showcase/showcase-runner'
export const maxDuration = 60
export async function POST(request: Request) {
    if (!await getAuthenticatedUser()) return Response.json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } }, { status: 401 })
    // A same-origin mutation; callers cannot supply the simulated clock or job key.
    const origin = request.headers.get('origin')
    if (origin && origin !== new URL(request.url).origin) return new Response('Forbidden', { status: 403 })
    try { return Response.json(await tickShowcase(prisma)) }
    catch { return Response.json({ error: { code: 'INTERNAL_ERROR', message: 'Showcase update failed' } }, { status: 500 }) }
}
