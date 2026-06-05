// Small composition helpers that wire the payment + wallet dependency chains.
// Mirrors the per-route `buildOrchestrator()` pattern used by the AI routes:
// every route file that needs a controller calls one of these instead of
// re-listing the repository/service wiring.

import { PaymentController } from '../../controllers/payment/payment.controller'
import { WalletController } from '../../controllers/wallet/wallet.controller'
import { CreditRepository } from '../../repositories/credit/credit.repository'
import { PaymentRepository } from '../../repositories/payment/payment.repository'

import { PaymentService } from './payment.service'
import { WalletService } from '../wallet/wallet.service'

export function buildPaymentController(): PaymentController {
    const paymentRepository = new PaymentRepository()
    const creditRepository = new CreditRepository()
    return new PaymentController(new PaymentService(paymentRepository, creditRepository))
}

export function buildWalletController(): WalletController {
    return new WalletController(new WalletService(new CreditRepository()))
}
