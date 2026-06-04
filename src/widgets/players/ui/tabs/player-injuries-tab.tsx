import { Calendar01Icon, Pulse01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { cn } from '@/shared/utils'

import type { InjuryRecord, Player } from '../../model/player.type'
import { TabEmptyState } from './tab-empty-state'

const statusBadgeClass = (status: InjuryRecord['status']): string => {
    if (status === 'On IL') return 'bg-[#ef4444]/12 text-[#dc2626]'
    if (status === 'Probable' || status === 'Day-to-day') return 'bg-[#f59e0b]/12 text-[#d97706]'
    return 'bg-[#22c55e]/12 text-[#16a34a]'
}

export const PlayerInjuriesTab = ({ player }: { player: Player }) => {
    if (player.injuries.length === 0) {
        return (
            <TabEmptyState
                icon={Pulse01Icon}
                title="No injury history"
                description="This player has a clean bill of health this season."
            />
        )
    }

    return (
        <>
            <div className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Injury history
            </div>
            <div className="space-y-2.5">
                {player.injuries.map((injury, idx) => (
                    <div
                        key={`${injury.date}-${idx}`}
                        className="rounded-xl border border-foreground/10 p-3.5"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{injury.type}</span>
                            <span
                                className={cn(
                                    'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                                    statusBadgeClass(injury.status),
                                )}
                            >
                                {injury.status}
                            </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <HugeiconsIcon icon={Calendar01Icon} className="size-3.5" />
                            {injury.date}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{injury.note}</p>
                    </div>
                ))}
            </div>
        </>
    )
}
