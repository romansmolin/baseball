'use client'

import Link from 'next/link'

import { COMPANY } from '@/shared/company'
import { Checkbox } from '@/shared/ui/checkbox'

interface WithdrawalConsentProps {
    id: string
    checked: boolean
    onCheckedChange: (checked: boolean) => void
}

const linkClass = 'font-medium text-foreground underline underline-offset-2 hover:text-primary'

/** The click-to-accept notice right above the pay buttons, with the seller's identity. */
export const WithdrawalConsent = ({ id, checked, onCheckedChange }: WithdrawalConsentProps) => (
    <div className="mt-2 space-y-2 text-xs text-muted-foreground">
        <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5">
            <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(value) => onCheckedChange(!!value)}
                className="mt-0.5"
            />
            <span>
                I agree to the{' '}
                <Link href="/legal/terms" target="_blank" className={linkClass}>Terms of Service</Link> and the{' '}
                <Link href="/legal/refunds" target="_blank" className={linkClass}>Refund &amp; Return Policy</Link>. I
                expressly consent to the immediate supply of the purchased digital content and acknowledge that I
                may lose my statutory right of withdrawal once I begin using the Credits.
            </span>
        </label>
        <p>
            Sold by {COMPANY.legalName}, {COMPANY.country}. Prices are in EUR; the amount and currency you pay are
            shown on the payment page before you confirm.
        </p>
    </div>
)
