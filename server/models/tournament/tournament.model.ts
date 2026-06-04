import type { Prisma } from '../../../src/generated/prisma/client'

// Tournament with the relations the catalog UI needs:
//   - _count.members → memberCount on the card
// LeagueMember rows are loaded separately when computing standings, so we
// don't include them here.
export type TournamentWithMemberCount = Prisma.LeagueGetPayload<{
    include: {
        _count: { select: { members: true } }
    }
}>

// Standings depend on each member's linked FantasyTeam + User for display.
// Scoring no longer reads rosterSlots from this shape — frozen lineups live
// in WeeklyLineup and are loaded by the scoring engine.
export type LeagueMemberWithTeam = Prisma.LeagueMemberGetPayload<{
    include: {
        user: { select: { id: true; name: true } }
        fantasyTeam: {
            select: {
                id: true
                name: true
            }
        }
    }
}>
