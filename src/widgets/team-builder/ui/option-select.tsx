'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

interface OptionSelectOption<T extends string> {
    value: T
    label: string
    disabled?: boolean
}

interface OptionSelectProps<T extends string> {
    value: T
    options: OptionSelectOption<T>[]
    onChange: (value: T) => void
    ariaLabel: string
    disabled?: boolean
    title?: string
}

// A small labelled-option dropdown built on the shadcn Select.
export const OptionSelect = <T extends string>({
    value,
    options,
    onChange,
    ariaLabel,
    disabled,
    title,
}: OptionSelectProps<T>) => (
    <Select
        items={options.map(({ value: optionValue, label }) => ({ value: optionValue, label }))}
        value={value}
        disabled={disabled}
        onValueChange={(next) => next != null && onChange(next as T)}
    >
        <SelectTrigger size="sm" aria-label={ariaLabel} title={title} className="min-w-28 text-foreground">
            <SelectValue />
        </SelectTrigger>
        <SelectContent>
            {options.map((option) => (
                <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
)
