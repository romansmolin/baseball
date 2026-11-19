'use client'

import { useCompare } from '../model/use-compare'
import { useCompareView } from '../model/use-compare-view'

import { ComparePicker } from './compare-picker'
import { CompareSummary } from './compare-summary'
import { CompareTable } from './compare-table'

export const CompareWorkbench = () => {
    const { ids, add, remove, players, missingIds, isLoading, error } = useCompare()
    const { view, showAdvanced, toggleAdvanced } = useCompareView(players)

    return (
        <div className="space-y-5">
            <ComparePicker ids={ids} players={players} onPick={add} onRemove={remove} />

            {ids.length < 2 && (
                <p className="rounded-lg border border-dashed border-foreground/15 px-4 py-10 text-center text-sm text-muted-foreground">
                    {ids.length === 0
                        ? 'Pick two or more players to compare their stats, recent form, splits and expected stats side by side.'
                        : 'Add one more player to see the comparison.'}
                </p>
            )}
            {ids.length >= 2 && isLoading && <p className="text-sm text-muted-foreground">Loading comparison…</p>}
            {ids.length >= 2 && error && (
                <p className="text-sm text-[#dc2626]">We could not load this comparison. Try again in a moment.</p>
            )}
            {missingIds.length > 0 && (
                <p className="text-sm text-muted-foreground">No data for player id {missingIds.join(', ')}.</p>
            )}
            {players.length >= 2 && (
                <>
                    <CompareSummary
                        players={players}
                        leads={view.leads}
                        contested={view.contested}
                        outlookBest={view.outlookBest}
                        onRemove={remove}
                    />
                    <CompareTable names={players.map((p) => p.player)} sections={view.sections} />
                    {view.hasAdvanced && (
                        <button
                            type="button"
                            onClick={toggleAdvanced}
                            className="rounded-lg border border-foreground/15 px-3 py-1.5 text-sm hover:bg-muted/50"
                        >
                            {showAdvanced ? 'Hide advanced stats' : 'Show advanced stats (wOBA, wRC+, FIP, Statcast…)'}
                        </button>
                    )}
                </>
            )}
            {ids.length >= 2 && (
                <p className="text-xs text-muted-foreground">
                    Outlook scores are statistical estimates for fantasy decisions, not predictions or betting advice.
                </p>
            )}
        </div>
    )
}
