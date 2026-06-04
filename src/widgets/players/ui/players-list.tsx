'use client'

import { PlayerRow } from './player-row'
import type { League, Player } from '../model/player.type'

interface PlayersListProps {
    players: Player[]
    leaguesBySlug: Map<string, League>
    onSelect: (id: number) => void
}

export const PlayersList = ({ players, leaguesBySlug, onSelect }: PlayersListProps) => (
    <>
        <div className="mb-1 flex items-center gap-3 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            <span className="w-10" />
            <span className="flex-1">Player</span>
            <span className="hidden w-24 text-center sm:block">Form (L5)</span>
            <span className="hidden w-16 text-right md:block">Salary</span>
            <span className="hidden w-14 text-right md:block">Own</span>
            <span className="w-16 text-right">Proj</span>
            <span className="w-4" />
        </div>
        <div className="space-y-1.5">
            {players.map((player) => (
                <PlayerRow
                    key={player.id}
                    player={player}
                    league={leaguesBySlug.get(player.leagueSlug)}
                    onSelect={() => onSelect(player.id)}
                />
            ))}
        </div>
    </>
)
