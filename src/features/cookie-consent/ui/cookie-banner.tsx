'use client'

import Link from 'next/link'

import { Button } from '@/shared/ui/button'

import { useCookieConsent } from '../model/use-cookie-consent'

export function CookieBanner() {
    const { consent, choose } = useCookieConsent()

    if (consent !== 'unknown') return null

    return (
        <section
            role="region"
            aria-label="Cookie consent"
            className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-lg border border-border bg-card p-4 shadow-xl sm:p-5"
        >
            <p className="text-sm leading-relaxed">
                We use essential cookies to keep you signed in and your account secure. At checkout, our payment
                partner may also set security cookies for card authentication. We do not use advertising cookies.{' '}
                <Link href="/legal/cookies" className="font-medium underline underline-offset-2 hover:text-primary">
                    Read the Cookies Policy
                </Link>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => choose('accepted')}>Accept all</Button>
                <Button variant="outline" onClick={() => choose('essential')}>Essential only</Button>
            </div>
        </section>
    )
}
