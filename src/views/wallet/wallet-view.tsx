import { Suspense } from 'react'

import { WalletBalance, WalletHistory, WalletPacks, WalletPaymentToast } from '@/widgets/wallet'

export const WalletView = () => (
    <main className="container mx-auto max-w-4xl space-y-6 px-6 py-8">
        <Suspense fallback={null}>
            <WalletPaymentToast />
        </Suspense>

        <div>
            <h1 className="font-anton text-3xl tracking-wide">Wallet</h1>
            <p className="mt-1 text-sm text-muted-foreground">
                Track your credits and buy more whenever you need to ante up.
            </p>
        </div>

        <WalletBalance />
        <WalletPacks />
        <WalletHistory />
    </main>
)
