import { ProjectionsController } from '../../controllers/projections/projections.controller'
import { getSportsProvider } from '../../providers/sports-provider.factory'

import { ProjectionsService } from './projections.service'

export function buildProjectionsService(): ProjectionsService {
    return new ProjectionsService(getSportsProvider())
}

export function buildProjectionsController(): ProjectionsController {
    return new ProjectionsController(buildProjectionsService())
}
