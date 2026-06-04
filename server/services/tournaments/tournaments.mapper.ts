import type { TournamentWithMemberCount } from '../../models/tournament/tournament.model'
import type { TournamentRecord } from '@/shared/tournaments'

import { computeTournamentCurrentWeek } from './tournament-week.util'

// Prisma row → TournamentRecord. Status/visibility are already uppercase in
// both the DB and the public contract, so the only derived value is currentWeek.
export function mapTournamentToRecord(row: TournamentWithMemberCount): TournamentRecord {
    const currentWeek = computeTournamentCurrentWeek({
        status: row.status,
        startsAt: row.startsAt,
        totalWeeks: row.totalWeeks,
    })

    return {
        id: row.id,
        name: row.name,
        leagueSlug: row.leagueSlug,
        visibility: row.visibility,
        status: row.status,
        startsAt: row.startsAt.toISOString(),
        endsAt: row.endsAt.toISOString(),
        totalWeeks: row.totalWeeks,
        currentWeek,
        entryFeeCredits: row.entryFeeCredits,
        prizePoolCredits: row.prizePoolCredits,
        memberCount: row._count.members,
    }
}
