import type { League, Player } from '../../model/player.type'

const hexA = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16)
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

interface PlayerMetricsTabProps {
    player: Player
    league: League | undefined
}

export const PlayerMetricsTab = ({ player, league }: PlayerMetricsTabProps) => {
    const color = league?.color ?? '#999999'
    const max = Math.max(...player.form, 1)

    return (
        <>
            <div className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Advanced metrics
            </div>
            <div className="grid grid-cols-2 gap-2.5">
                {Object.entries(player.metrics).map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-foreground/10 p-3.5">
                        <div className="font-anton text-xl leading-none">{v}</div>
                        <div className="mt-1.5 text-[11px] text-muted-foreground">{k}</div>
                    </div>
                ))}
            </div>

            <div className="mt-4 rounded-xl bg-muted/50 p-4">
                <div className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Recent form (last 5)
                </div>
                <div className="flex items-end gap-2">
                    {player.form.map((v, i) => (
                        <div key={i} className="flex flex-1 flex-col items-center gap-1">
                            <div
                                className="w-full rounded-md"
                                style={{
                                    height: `${Math.max(6, (v / max) * 64)}px`,
                                    backgroundColor: v === 0 ? '#e3e3e3' : hexA(color, 0.5),
                                }}
                            />
                            <span className="font-mono text-[11px] text-muted-foreground">{v}</span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}
