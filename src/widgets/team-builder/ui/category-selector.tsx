'use client'

import {
    CATEGORY_KEYS,
    CATEGORY_LABEL,
    CATEGORY_SIDE,
    type CategoryKey,
    type CategorySide,
} from '@/shared/team-builder'

interface CategorySelectorProps {
    categories: CategoryKey[]
    onChange: (categories: CategoryKey[]) => void
}

const SIDES: { side: CategorySide; title: string }[] = [
    { side: 'hitting', title: 'Hitting' },
    { side: 'pitching', title: 'Pitching' },
]

export const CategorySelector = ({ categories, onChange }: CategorySelectorProps) => {
    const toggle = (key: CategoryKey) => {
        const next = categories.includes(key) ? categories.filter((entry) => entry !== key) : [...categories, key]
        // Keep the canonical order; at least one category stays on.
        if (next.length > 0) onChange(CATEGORY_KEYS.filter((entry) => next.includes(entry)))
    }

    return (
        <div className="space-y-3">
            <div className="text-sm font-medium">Scoring categories</div>
            {SIDES.map(({ side, title }) => (
                <div key={side}>
                    <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase">{title}</div>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORY_KEYS.filter((key) => CATEGORY_SIDE[key] === side).map((key) => (
                            <label
                                key={key}
                                className="flex cursor-pointer items-center gap-1.5 rounded-md border border-foreground/10 px-2 py-1 text-xs"
                                title={CATEGORY_LABEL[key]}
                            >
                                <input
                                    type="checkbox"
                                    checked={categories.includes(key)}
                                    onChange={() => toggle(key)}
                                    aria-label={`${CATEGORY_LABEL[key]} category`}
                                />
                                {key}
                            </label>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
