'use client'

import { LeagueCard } from './league-card'
import type { League } from '../model/league.type'

interface LeaguesGridProps {
    leagues: League[]
    onSelect: (slug: string) => void
}

export const LeaguesGrid = ({ leagues, onSelect }: LeaguesGridProps) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {leagues.map((league) => (
            <LeagueCard key={league.slug} league={league} onSelect={() => onSelect(league.slug)} />
        ))}
    </div>
)
