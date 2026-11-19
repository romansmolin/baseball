import { ApiError } from '../../../../../server/errors/api.error'
import { buildAdminController } from '../../../../../server/services/admin/admin.composition'
import { getAuthenticatedUser } from '../../../../../server/shared/auth.utils'

const adminController = buildAdminController()

// POST rather than GET keeps the customer's email out of URLs and access logs.
// The controller's service re-checks the caller's ADMIN role on every request.
export async function POST(request: Request) {
    const user = await getAuthenticatedUser()
    if (!user) return ApiError.unauthorized().toResponse()

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return ApiError.validationError('Invalid JSON body').toResponse()
    }

    return adminController.createUserReport(user.id, body)
}
