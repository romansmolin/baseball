import { cn } from '@/shared/utils'

import type { CompareSectionView } from '../model/compare-view'

interface CompareTableProps {
    names: { id: number; fullName: string; position: string }[]
    sections: CompareSectionView[]
}

export const CompareTable = ({ names, sections }: CompareTableProps) => (
    <div className="overflow-x-auto rounded-xl border border-foreground/10 bg-card">
        <table className="w-full min-w-[560px] text-sm">
            <thead>
                <tr className="border-b border-foreground/10 align-bottom">
                    <th className="sticky left-0 w-52 bg-card p-3" />
                    {names.map((p) => (
                        <th key={p.id} className="p-3 text-left font-normal">
                            <div className="truncate font-medium">{p.fullName}</div>
                            <div className="text-xs text-muted-foreground">{p.position}</div>
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {sections.map((section) => (
                    <SectionRows key={section.title} section={section} names={names} />
                ))}
            </tbody>
        </table>
    </div>
)

const SectionRows = ({ section, names }: { section: CompareSectionView; names: CompareTableProps['names'] }) => (
    <>
        <tr>
            <th
                colSpan={names.length + 1}
                className="bg-muted/40 px-3 py-1.5 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
            >
                {section.title}
            </th>
        </tr>
        {section.rows.map((row) => (
            <tr key={row.key} className="border-b border-foreground/5 last:border-0">
                <td className="sticky left-0 bg-card px-3 py-2">
                    <div className="text-foreground">{row.label}</div>
                    <div className="text-[11px] leading-tight text-muted-foreground">{row.hint}</div>
                </td>
                {row.cells.map((cell, index) => (
                    <td
                        key={names[index].id}
                        className={cn('px-3 py-2 font-mono tabular-nums', cell.best && 'bg-[#22c55e]/10 font-semibold text-[#16a34a]')}
                    >
                        {cell.text}
                        {cell.gap && <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">{cell.gap}</span>}
                    </td>
                ))}
            </tr>
        ))}
    </>
)
