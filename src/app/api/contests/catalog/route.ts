import { ContestCatalogRepository } from '../../../../../server/repositories/contest-catalog/contest-catalog.repository'
import type { ContestCatalogKind, ContestCatalogPhase, ContestCatalogView } from '@/shared/tournaments'

export const dynamic = 'force-dynamic'

function boundedInteger(value: string | null, fallback: number, min: number, max: number): number | null {
    if (value === null) return fallback
    if (!/^\d+$/.test(value)) return null
    const parsed = Number(value)
    return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null
}

export async function GET(request: Request) {
    const query = new URL(request.url).searchParams
    const viewValue = query.get('view') ?? 'current'
    const kindValue = query.get('kind')
    const phaseValue = query.get('phase')
    const limit = boundedInteger(query.get('limit'), 20, 1, 100)
    const offset = boundedInteger(query.get('offset'), 0, 0, 5000)
    if (viewValue !== 'current' && viewValue !== 'history') {
        return Response.json({ error: { message: 'Invalid contest view' } }, { status: 400 })
    }
    if (kindValue && !['DAILY', 'SERIES', 'LEAGUE'].includes(kindValue)) {
        return Response.json({ error: { message: 'Invalid contest kind' } }, { status: 400 })
    }
    if (phaseValue && phaseValue !== 'open' && phaseValue !== 'live') {
        return Response.json({ error: { message: 'Invalid contest phase' } }, { status: 400 })
    }
    if (limit === null || offset === null) {
        return Response.json({ error: { message: 'Invalid page parameters' } }, { status: 400 })
    }
    try {
        const result = await new ContestCatalogRepository().list({
            view: viewValue as ContestCatalogView,
            ...(phaseValue ? { phase: phaseValue as ContestCatalogPhase } : {}),
            ...(kindValue ? { kind: kindValue as ContestCatalogKind } : {}),
            search: query.get('search') ?? undefined,
            limit,
            offset,
        })
        return Response.json(result)
    } catch (error) {
        console.error('[ContestCatalog]', error)
        return Response.json({ error: { message: 'Unable to load contests' } }, { status: 500 })
    }
}
