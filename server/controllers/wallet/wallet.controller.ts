import { ApiError } from '../../errors/api.error'
import type { IWalletService } from '../../services/wallet/wallet.service.interface'

import type { IWalletController } from './wallet.controller.interface'

export class WalletController implements IWalletController {
    private readonly walletService: IWalletService

    constructor(walletService: IWalletService) {
        this.walletService = walletService
    }

    async getWallet(userId: string): Promise<Response> {
        try {
            const wallet = await this.walletService.getWallet(userId)
            return Response.json(wallet)
        } catch (error) {
            return this.handleError(error)
        }
    }

    async getCreditsSummary(userId: string): Promise<Response> {
        try {
            const summary = await this.walletService.getCreditsSummary(userId)
            return Response.json(summary)
        } catch (error) {
            return this.handleError(error)
        }
    }

    async getPacks(): Promise<Response> {
        try {
            return Response.json(this.walletService.getPacks())
        } catch (error) {
            return this.handleError(error)
        }
    }

    async getPricing(): Promise<Response> {
        try {
            return Response.json(this.walletService.getPricing())
        } catch (error) {
            return this.handleError(error)
        }
    }

    private handleError(error: unknown): Response {
        if (error instanceof ApiError) {
            return error.toResponse()
        }
        console.error('[WalletController]', error)
        return ApiError.internal().toResponse()
    }
}
