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
        <div className="mb-1 flex items-center justify-between gap-3 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            <span>Player</span>
            <span>Season stats · {players[0]?.statsSeason}</span>
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
