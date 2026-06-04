'use client'

import { cn } from '@/shared/utils'

import { TeamCard } from './team-card'
import type { League, Team, ViewMode } from '../model/team.type'

interface TeamsGridProps {
    teams: Team[]
    leaguesBySlug: Map<string, League>
    favs: Record<string, boolean>
    view: ViewMode
    onSelect: (id: string) => void
    onToggleFav: (id: string) => void
}

export const TeamsGrid = ({ teams, leaguesBySlug, favs, view, onSelect, onToggleFav }: TeamsGridProps) => (
    <div
        className={cn(
            view === 'list' ? 'grid grid-cols-1 gap-2.5' : 'grid grid-cols-1 gap-3 sm:grid-cols-2',
        )}
    >
        {teams.map((team) => (
            <TeamCard
                key={team.id}
                team={team}
                league={leaguesBySlug.get(team.leagueSlug)}
                isFav={!!favs[team.id]}
                view={view}
                onSelect={() => onSelect(team.id)}
                onToggleFav={() => onToggleFav(team.id)}
            />
        ))}
    </div>
)
