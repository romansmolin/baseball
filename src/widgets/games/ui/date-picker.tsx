import { cn } from '@/shared/utils'

interface DatePickerProps {
    days: Array<{ dateKey: string; count: number }>
    activeKey: string | null
    onSelect: (dateKey: string) => void
}

const part = (dateKey: string, options: Intl.DateTimeFormatOptions) =>
    new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, options)

export const DatePicker = ({ days, activeKey, onSelect }: DatePickerProps) => (
    <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
            <h2 className="text-base font-semibold">Choose a date</h2>
            <p className="text-sm text-muted-foreground">Browse the next days of matchups.</p>
        </div>
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {days.map((day) => {
                const active = day.dateKey === activeKey
                return (
                    <button
                        key={day.dateKey}
                        type="button"
                        onClick={() => onSelect(day.dateKey)}
                        aria-pressed={active}
                        title={`${day.count} ${day.count === 1 ? 'game' : 'games'}`}
                        className={cn(
                            'flex w-[4.5rem] shrink-0 flex-col items-center gap-0.5 rounded-2xl border px-2 py-3 transition-colors',
                            'focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none',
                            active
                                ? 'border-board bg-board text-board-foreground shadow-md'
                                : 'border-foreground/10 bg-card hover:border-foreground/30',
                        )}
                    >
                        <span className="text-[11px] font-medium tracking-wider uppercase opacity-70">
                            {part(day.dateKey, { weekday: 'short' })}
                        </span>
                        <span className="text-2xl leading-none font-bold tabular-nums">
                            {part(day.dateKey, { day: 'numeric' })}
                        </span>
                        <span className="text-[11px] font-medium tracking-wider uppercase opacity-70">
                            {part(day.dateKey, { month: 'short' })}
                        </span>
                    </button>
                )
            })}
        </div>
    </div>
)
