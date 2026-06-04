import { AIFeaturesController } from '../../../../../server/controllers/ai/features/ai-features.controller'
import { AIFeaturesService } from '../../../../../server/services/ai/features/ai-features.service'

const aiFeaturesController = new AIFeaturesController(new AIFeaturesService())

export async function GET(_request: Request) {
    return aiFeaturesController.list()
}
