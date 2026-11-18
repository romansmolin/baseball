import { MeController } from '../../../../../../server/controllers/me/me.controller'
import { ApiError } from '../../../../../../server/errors/api.error'
import { FantasyTeamRepository } from '../../../../../../server/repositories/fantasy-team/fantasy-team.repository'
import { MeService } from '../../../../../../server/services/me/me.service'
import { getAuthenticatedUser } from '../../../../../../server/shared/auth.utils'

const meController = new MeController(new MeService(new FantasyTeamRepository()))

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const user = await getAuthenticatedUser()
    if (!user) {
        return ApiError.unauthorized().toResponse()
    }

    const { id } = await params

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return ApiError.validationError('Invalid JSON body').toResponse()
    }

    return meController.renameMyTeam(body, user.id, id)
}
