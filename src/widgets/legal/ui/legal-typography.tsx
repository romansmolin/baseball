import { cn } from '@/shared/utils'

export const Section = ({
    id,
    title,
    children,
}: {
    id?: string
    title: string
    children: React.ReactNode
}) => (
    <section id={id} className="scroll-mt-24">
        <h2 className="mt-12 mb-4 font-anton text-2xl tracking-wide text-foreground first:mt-0 md:text-3xl">
            {title}
        </h2>
        <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground">
            {children}
        </div>
    </section>
)

export const Sub = ({
    title,
    children,
}: {
    title: string
    children: React.ReactNode
}) => (
    <div className="space-y-3">
        <h3 className="mt-6 text-base font-semibold text-foreground">{title}</h3>
        <div className="space-y-3">{children}</div>
    </div>
)

export const P = ({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) => <p className={cn('text-[15px] leading-relaxed', className)}>{children}</p>

export const List = ({
    items,
    ordered = false,
}: {
    items: React.ReactNode[]
    ordered?: boolean
}) => {
    const Tag = ordered ? 'ol' : 'ul'
    return (
        <Tag
            className={cn(
                'space-y-2 pl-6 text-[15px] leading-relaxed marker:text-muted-foreground/60',
                ordered ? 'list-decimal' : 'list-disc',
            )}
        >
            {items.map((item, i) => (
                <li key={i}>{item}</li>
            ))}
        </Tag>
    )
}

export const Callout = ({ children }: { children: React.ReactNode }) => (
    <div className="my-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
        {children}
    </div>
)

export const DefList = ({
    items,
}: {
    items: { term: string; definition: React.ReactNode }[]
}) => (
    <dl className="space-y-4 text-[15px] leading-relaxed">
        {items.map((item) => (
            <div key={item.term}>
                <dt className="font-semibold text-foreground">{item.term}</dt>
                <dd className="mt-1">{item.definition}</dd>
            </div>
        ))}
    </dl>
)

interface TableRow {
    cells: React.ReactNode[]
}

export const Table = ({
    headers,
    rows,
}: {
    headers: string[]
    rows: TableRow[]
}) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-foreground/10">
        <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-muted/60">
                <tr>
                    {headers.map((h) => (
                        <th
                            key={h}
                            className="border-b border-foreground/10 px-4 py-2.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                        >
                            {h}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i} className="border-b border-foreground/10 last:border-b-0">
                        {row.cells.map((cell, j) => (
                            <td
                                key={j}
                                className="px-4 py-3 align-top text-[14px] text-foreground/90"
                            >
                                {cell}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
)
