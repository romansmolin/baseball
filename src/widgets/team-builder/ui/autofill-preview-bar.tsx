'use client'

import type { RosterSlotDef } from '@/shared/team-builder'

import type { AutofillPreview } from '../model/use-team-builder-state'

interface AutofillPreviewBarProps {
    preview: AutofillPreview
    slots: RosterSlotDef[]
    onAccept: () => void
    onDiscard: () => void
}

export const AutofillPreviewBar = ({ preview, slots, onAccept, onDiscard }: AutofillPreviewBarProps) => {
    const labelOf = (slotId: string) => slots.find((slot) => slot.id === slotId)?.label ?? slotId
    const hasPicks = preview.picks.length > 0

    return (
        <div className="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="font-medium">
                    {hasPicks ? `AI suggests ${preview.picks.length} player${preview.picks.length === 1 ? '' : 's'}` : 'AI could not fill the open slots'}
                </div>
                {hasPicks && (
                    <div className="text-xs text-muted-foreground">
                        <span className="font-anton text-base text-primary">{preview.totalPoints.toFixed(1)}</span> proj pts for the suggested slots
                        {preview.basis === 'season-pace' && ' · season-pace estimate'}
                    </div>
                )}
            </div>

            {preview.explanation && <p className="text-sm text-muted-foreground">{preview.explanation}</p>}

            {hasPicks && (
                <ul className="flex flex-wrap gap-1.5 text-xs">
                    {preview.picks.map((pick) => (
                        <li key={pick.slotId} className="rounded-full border border-foreground/15 bg-card px-2 py-0.5">
                            <span className="font-semibold">{labelOf(pick.slotId)}</span> {pick.playerName}{' '}
                            <span className="text-primary">{pick.projectedPoints.toFixed(1)}</span>
                        </li>
                    ))}
                </ul>
            )}

            {preview.unfilled.length > 0 && (
                <ul className="space-y-1 text-xs text-destructive">
                    {preview.unfilled.map((slot) => (
                        <li key={slot.slotId}>
                            <span className="font-semibold">{labelOf(slot.slotId)}:</span> {slot.message}
                        </li>
                    ))}
                </ul>
            )}

            <div className="flex gap-2">
                {hasPicks && (
                    <button
                        type="button"
                        onClick={onAccept}
                        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:brightness-95"
                    >
                        Accept
                    </button>
                )}
                <button
                    type="button"
                    onClick={onDiscard}
                    className="rounded-md border border-foreground/15 px-3 py-1.5 text-sm hover:bg-muted"
                >
                    {hasPicks ? 'Discard' : 'Close'}
                </button>
            </div>
        </div>
    )
}
