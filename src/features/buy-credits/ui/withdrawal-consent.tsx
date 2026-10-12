'use client'

import { Checkbox } from '@/shared/ui/checkbox'

interface WithdrawalConsentProps {
    id: string
    checked: boolean
    onCheckedChange: (checked: boolean) => void
}

export const WithdrawalConsent = ({ id, checked, onCheckedChange }: WithdrawalConsentProps) => (
    <label
        htmlFor={id}
        className="mt-2 flex cursor-pointer items-start gap-2.5 text-xs text-muted-foreground"
    >
        <Checkbox
            id={id}
            checked={checked}
            onCheckedChange={(value) => onCheckedChange(!!value)}
            className="mt-0.5"
        />
        <span>
            I expressly consent to the immediate supply of the purchased digital content and
            acknowledge that I may lose my statutory right of withdrawal once I begin using the
            Credits.
        </span>
    </label>
)
