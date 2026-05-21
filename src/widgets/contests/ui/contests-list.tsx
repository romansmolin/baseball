'use client'

import { ContestCard } from './contest-card'
import type { Contest, League } from '../model/contest.type'

interface ContestsListProps {
    contests: Contest[]
    leaguesBySlug: Map<string, League>
    selectedContestId: string | null
    onSelect: (id: string) => void
}

export const ContestsList = ({
    contests,
    leaguesBySlug,
    selectedContestId,
    onSelect,
}: ContestsListProps) => {
    if (contests.length === 0) {
        return (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
                No contests match these filters.
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3 overflow-y-auto p-4">
            {contests.map((contest) => (
                <ContestCard
                    key={contest.id}
                    contest={contest}
                    league={leaguesBySlug.get(contest.leagueSlug)}
                    isSelected={contest.id === selectedContestId}
                    onSelect={() => onSelect(contest.id)}
                />
            ))}
        </div>
    )
}
