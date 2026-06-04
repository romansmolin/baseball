import { ArrowLeftRightIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type { Player } from '../../model/player.type'
import { TabEmptyState } from './tab-empty-state'

export const PlayerTransfersTab = ({ player }: { player: Player }) => {
    if (player.transfers.length === 0) {
        return (
            <TabEmptyState
                icon={ArrowLeftRightIcon}
                title="No transfers on record"
                description="Career spent with a single organization."
            />
        )
    }

    return (
        <>
            <div className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Transfer &amp; roster moves
            </div>
            <div className="relative space-y-0 pl-5">
                <span className="absolute top-1 bottom-1 left-1.5 w-px bg-foreground/10" />
                {player.transfers.map((transfer, idx) => (
                    <div key={`${transfer.date}-${idx}`} className="relative pb-5 last:pb-0">
                        <span className="absolute top-1 -left-[14px] size-2.5 rounded-full border-2 border-card bg-primary" />
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">{transfer.from}</span>
                            <HugeiconsIcon
                                icon={ArrowRight01Icon}
                                className="size-3.5 text-muted-foreground/60"
                            />
                            <span className="font-medium">{transfer.to}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{transfer.date}</span>
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                                {transfer.type}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </>
    )
}
