import { ApiError } from '../../../../server/errors/api.error'
import { buildWalletController } from '../../../../server/services/payment/payment.composition'
import { getAuthenticatedUser } from '../../../../server/shared/auth.utils'

const walletController = buildWalletController()

export async function GET(_request: Request) {
    const user = await getAuthenticatedUser()
    if (!user) return ApiError.unauthorized().toResponse()

    return walletController.getWallet(user.id)
}
