'use client'

import {
    FANTASY_FORMATS,
    FORMAT_DESCRIPTION,
    FORMAT_LABEL,
    SUPPORTED_FORMATS,
    type FantasyFormat,
} from '@/shared/team-builder'
import { cn } from '@/shared/utils'

interface FormatPickerProps {
    onChoose: (format: FantasyFormat) => void
}

const H2H_FORMATS: FantasyFormat[] = ['H2H_POINTS', 'H2H_CATEGORIES']

const FormatCard = ({ format, onChoose }: { format: FantasyFormat; onChoose: (format: FantasyFormat) => void }) => {
    const supported = SUPPORTED_FORMATS.includes(format)
    return (
        <button
            type="button"
            onClick={() => onChoose(format)}
            disabled={!supported}
            className={cn(
                'flex flex-col items-start gap-1.5 rounded-xl border border-foreground/10 bg-card p-4 text-left transition-colors',
                supported ? 'hover:border-primary/50 hover:bg-primary/5' : 'cursor-not-allowed opacity-60',
            )}
        >
            <span className="flex items-center gap-2">
                <span className="font-anton text-lg tracking-wide">{FORMAT_LABEL[format]}</span>
                {!supported && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
                        Soon
                    </span>
                )}
            </span>
            <span className="text-sm text-muted-foreground">{FORMAT_DESCRIPTION[format]}</span>
        </button>
    )
}

export const FormatPicker = ({ onChoose }: FormatPickerProps) => {
    const others = FANTASY_FORMATS.filter((format) => !H2H_FORMATS.includes(format))
    return (
        <main className="container mx-auto max-w-4xl px-6 py-10">
            <h1 className="font-anton text-3xl tracking-wide">How does your league decide a winner?</h1>
            <p className="mt-1 text-sm text-muted-foreground">
                Pick the format you play on your fantasy platform. Projections and AI picks follow its rules.
            </p>

            <div className="mt-6 space-y-2">
                <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Head-to-Head
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    {H2H_FORMATS.map((format) => (
                        <FormatCard key={format} format={format} onChoose={onChoose} />
                    ))}
                </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {others.map((format) => (
                    <FormatCard key={format} format={format} onChoose={onChoose} />
                ))}
            </div>
        </main>
    )
}
