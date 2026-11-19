import { CATEGORY_LABEL, type CategoryKey } from '@/shared/team-builder'

interface CategoryTotalsProps {
    categories: CategoryKey[]
    totals: Partial<Record<CategoryKey, number>>
}

// AVG reads .268, ERA / WHIP two decimals, counting categories whole numbers.
const format = (key: CategoryKey, value: number) =>
    key === 'AVG'
        ? value.toFixed(3).replace(/^0/, '')
        : key === 'ERA' || key === 'WHIP'
          ? value.toFixed(2)
          : String(Math.round(value))

export const CategoryTotals = ({ categories, totals }: CategoryTotalsProps) => (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {categories.map((key) => (
            <li key={key} className="flex items-baseline gap-1.5" title={CATEGORY_LABEL[key]}>
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{key}</span>
                <span className="font-anton text-base leading-none">
                    {totals[key] === undefined ? '—' : format(key, totals[key] as number)}
                </span>
            </li>
        ))}
    </ul>
)
