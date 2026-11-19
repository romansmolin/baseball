'use client'

import { SLOT_TYPES, type SlotConfig, type SlotType } from '@/shared/team-builder'

interface SlotConfigEditorProps {
    config: SlotConfig
    onChange: (config: SlotConfig) => void
}

const MAX_PER_TYPE = 10
const MAX_TOTAL = 30

export const SlotConfigEditor = ({ config, onChange }: SlotConfigEditorProps) => {
    const countOf = (slot: SlotType) => config.find((entry) => entry.slot === slot)?.count ?? 0
    const total = config.reduce((sum, entry) => sum + entry.count, 0)

    const setCount = (slot: SlotType, count: number) => {
        const next = SLOT_TYPES.map((type) => ({ slot: type, count: type === slot ? count : countOf(type) })).filter(
            (entry) => entry.count > 0,
        )
        onChange(next)
    }

    return (
        <div>
            <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
                Lineup slots · {total}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {SLOT_TYPES.map((slot) => {
                    const count = countOf(slot)
                    return (
                        <div key={slot} className="flex items-center justify-between rounded-md border border-foreground/10 px-2 py-1">
                            <span className="text-xs font-semibold">{slot}</span>
                            <span className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    aria-label={`Fewer ${slot} slots`}
                                    disabled={count === 0 || total <= 1}
                                    onClick={() => setCount(slot, count - 1)}
                                    className="size-5 rounded border border-foreground/15 text-xs disabled:opacity-30"
                                >
                                    −
                                </button>
                                <span className="w-4 text-center text-sm">{count}</span>
                                <button
                                    type="button"
                                    aria-label={`More ${slot} slots`}
                                    disabled={count >= MAX_PER_TYPE || total >= MAX_TOTAL}
                                    onClick={() => setCount(slot, count + 1)}
                                    className="size-5 rounded border border-foreground/15 text-xs disabled:opacity-30"
                                >
                                    +
                                </button>
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
