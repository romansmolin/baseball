'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useSWRConfig } from 'swr'

// When the user lands on /wallet?payment=success after a purchase, confirm it
// and revalidate the balance + history so the new credits show immediately.
export const WalletPaymentToast = () => {
    const searchParams = useSearchParams()
    const { mutate } = useSWRConfig()
    const handledRef = useRef(false)

    useEffect(() => {
        if (handledRef.current) return
        const payment = searchParams.get('payment')
        if (!payment) return
        handledRef.current = true

        if (payment === 'success') {
            toast.success('Payment successful — credits added to your wallet.')
            void mutate(['wallet'])
            void mutate(['me', 'credits'])
        } else if (payment === 'pending') {
            toast.info('Payment is still processing. Credits will appear once it clears.')
        } else if (payment === 'failed' || payment === 'declined') {
            toast.error('Payment did not go through. Please try again.')
        }
    }, [searchParams, mutate])

    return null
}
