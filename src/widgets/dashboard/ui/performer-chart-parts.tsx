export const HOT = 'var(--primary)'
export const COOL = 'color-mix(in oklab, var(--muted-foreground) 45%, transparent)'
export const LOSS = 'var(--destructive)'

// Baseball style: .412, not 0.412.
export const fmt = (value: number | null, digits: number) =>
    value === null ? '—' : value.toFixed(digits).replace(/^0\./, '.')

export const Panel = ({ title, note, children }: { title: string; note: string; children: React.ReactNode }) => (
    <section className="rounded-xl border border-foreground/10 p-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mb-3 text-xs text-muted-foreground">{note}</p>
        {children}
    </section>
)

interface ValueBarProps {
    label: string
    value: number | null
    max: number
    digits: number
    color: string
    unit?: string
    // Position (same scale as `value`) of a reference tick, e.g. the league average.
    marker?: number
}

export const ValueBar = ({ label, value, max, digits, color, unit = '', marker }: ValueBarProps) => (
    <div className="flex items-center gap-2 text-xs">
        <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
        <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, ((value ?? 0) / max) * 100)}%`, background: color }}
            />
            {marker !== undefined && (
                <div
                    className="absolute inset-y-0 w-0.5 bg-foreground/60"
                    style={{ left: `${Math.min(100, (marker / max) * 100)}%` }}
                />
            )}
        </div>
        <span className="w-14 shrink-0 text-right font-semibold tabular-nums">
            {fmt(value, digits)}
            {unit}
        </span>
    </div>
)
