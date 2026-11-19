'use client'

import { useState } from 'react'

import { cn } from '@/shared/utils'

import { MAX_COMPARE_PLAYERS } from '../model/compare-logic'
import { usePlayerSearch } from '../model/use-player-search'

const MIN_QUERY_LENGTH = 2

const Results = ({ query, selected, onPick }: { query: string; selected: number[]; onPick: (id: number) => void }) => {
    const { results, isLoading } = usePlayerSearch(query)

    if (isLoading) return <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
    if (results.length === 0) return <p className="px-3 py-2 text-sm text-muted-foreground">No players found.</p>

    return (
        <ul className="divide-y divide-foreground/5">
            {results.map((player) => {
                const taken = selected.includes(player.id)
                return (
                    <li key={player.id}>
                        <button
                            type="button"
                            disabled={taken}
                            onClick={() => onPick(player.id)}
                            className={cn(
                                'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/50',
                                taken && 'opacity-50',
                            )}
                        >
                            <span className="truncate font-medium">{player.fullName}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                                {player.position} · {player.teamAbbreviation ?? "—"}
                            </span>
                        </button>
                    </li>
                )
            })}
        </ul>
    )
}

export const ComparePicker = ({ selected, onPick }: { selected: number[]; onPick: (id: number) => void }) => {
    const [query, setQuery] = useState('')
    const full = selected.length >= MAX_COMPARE_PLAYERS
    const trimmed = query.trim()

    return (
        <div className="relative max-w-md">
            <input
                type="search"
                value={query}
                disabled={full}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={full ? `You can compare up to ${MAX_COMPARE_PLAYERS} players` : 'Search a player to add…'}
                className="h-10 w-full rounded-lg border border-foreground/15 bg-card px-3 text-sm outline-none focus-visible:border-primary disabled:opacity-60"
            />
            {!full && trimmed.length >= MIN_QUERY_LENGTH && (
                <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-foreground/10 bg-card shadow-lg">
                    <Results
                        query={trimmed}
                        selected={selected}
                        onPick={(id) => {
                            onPick(id)
                            setQuery('')
                        }}
                    />
                </div>
            )}
        </div>
    )
}
