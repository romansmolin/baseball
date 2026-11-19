import { ApiError } from '../../../../../server/errors/api.error'
import { getAuthenticatedUser } from '../../../../../server/shared/auth.utils'
import { buildProjectionsController } from '../../../../../server/services/projections/projections.composition'

export async function POST(request: Request) {
    const user = await getAuthenticatedUser()
    if (!user) {
        return ApiError.unauthorized().toResponse()
    }

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return ApiError.validationError('Invalid JSON body').toResponse()
    }

    return buildProjectionsController().projectTeams(body)
}
