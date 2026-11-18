import { MeController } from '../../../../../server/controllers/me/me.controller'
import { ApiError } from '../../../../../server/errors/api.error'
import { FantasyTeamRepository } from '../../../../../server/repositories/fantasy-team/fantasy-team.repository'
import { MeService } from '../../../../../server/services/me/me.service'
import { getAuthenticatedUser } from '../../../../../server/shared/auth.utils'

const meController = new MeController(new MeService(new FantasyTeamRepository()))

export async function GET(_request: Request) {
    const user = await getAuthenticatedUser()
    if (!user) {
        return ApiError.unauthorized().toResponse()
    }

    return meController.getBudget(user.id)
}
