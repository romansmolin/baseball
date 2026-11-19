'use client'

import { useCompare } from '../model/use-compare'

import { CompareTable } from './compare-table'
import { ComparePicker } from './compare-picker'

export const CompareWorkbench = () => {
    const { ids, add, remove, players, missingIds, isLoading, error } = useCompare()

    return (
        <div className="space-y-5">
            <ComparePicker selected={ids} onPick={add} />

            {ids.length < 2 && (
                <p className="rounded-lg border border-dashed border-foreground/15 px-4 py-10 text-center text-sm text-muted-foreground">
                    Pick at least two players to compare their stats, recent form, splits and expected stats side by side.
                </p>
            )}
            {ids.length >= 2 && isLoading && <p className="text-sm text-muted-foreground">Loading comparison…</p>}
            {ids.length >= 2 && error && (
                <p className="text-sm text-[#dc2626]">We could not load this comparison. Try again in a moment.</p>
            )}
            {missingIds.length > 0 && (
                <p className="text-sm text-muted-foreground">No data for player id {missingIds.join(', ')}.</p>
            )}
            {players.length >= 2 && <CompareTable players={players} onRemove={remove} />}
            {ids.length >= 2 && (
                <p className="text-xs text-muted-foreground">
                    Outlook scores are statistical estimates for fantasy decisions, not predictions or betting advice.
                </p>
            )}
        </div>
    )
}
