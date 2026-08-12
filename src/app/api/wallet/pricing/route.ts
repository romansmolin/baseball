import { buildWalletController } from '../../../../../server/services/payment/payment.composition'

const walletController = buildWalletController()

export async function GET(_request: Request) {
    return walletController.getPricing()
}
