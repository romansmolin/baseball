/*
  Warnings:

  - You are about to drop the column `leagueMemberId` on the `FantasyTeam` table. All the data in the column will be lost.
  - You are about to drop the column `totalScore` on the `FantasyTeam` table. All the data in the column will be lost.
  - You are about to drop the column `scoreContribution` on the `RosterSlot` table. All the data in the column will be lost.
  - You are about to drop the `ArchivedGameSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CommunityEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DailyContest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DailyEntry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DailyGameSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DemoProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `League` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LeagueMatchup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LeagueMember` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ManagerStanding` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RecurringTournament` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ScoringRule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShowcaseJob` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WeeklyLineup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WeeklyLineupSlot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WeeklyScoreCache` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CommunityEvent" DROP CONSTRAINT "CommunityEvent_contestId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityEvent" DROP CONSTRAINT "CommunityEvent_userId_fkey";

-- DropForeignKey
ALTER TABLE "DailyEntry" DROP CONSTRAINT "DailyEntry_contestId_fkey";

-- DropForeignKey
ALTER TABLE "DailyEntry" DROP CONSTRAINT "DailyEntry_userId_fkey";

-- DropForeignKey
ALTER TABLE "DemoProfile" DROP CONSTRAINT "DemoProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "FantasyTeam" DROP CONSTRAINT "FantasyTeam_leagueMemberId_fkey";

-- DropForeignKey
ALTER TABLE "League" DROP CONSTRAINT "League_commissionerId_fkey";

-- DropForeignKey
ALTER TABLE "League" DROP CONSTRAINT "League_scoringRuleId_fkey";

-- DropForeignKey
ALTER TABLE "LeagueMatchup" DROP CONSTRAINT "LeagueMatchup_leagueId_fkey";

-- DropForeignKey
ALTER TABLE "LeagueMatchup" DROP CONSTRAINT "LeagueMatchup_teamAId_fkey";

-- DropForeignKey
ALTER TABLE "LeagueMatchup" DROP CONSTRAINT "LeagueMatchup_teamBId_fkey";

-- DropForeignKey
ALTER TABLE "LeagueMember" DROP CONSTRAINT "LeagueMember_leagueId_fkey";

-- DropForeignKey
ALTER TABLE "LeagueMember" DROP CONSTRAINT "LeagueMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "ManagerStanding" DROP CONSTRAINT "ManagerStanding_userId_fkey";

-- DropForeignKey
ALTER TABLE "RecurringTournament" DROP CONSTRAINT "RecurringTournament_leagueId_fkey";

-- DropForeignKey
ALTER TABLE "WeeklyLineup" DROP CONSTRAINT "WeeklyLineup_leagueMemberId_fkey";

-- DropForeignKey
ALTER TABLE "WeeklyLineupSlot" DROP CONSTRAINT "WeeklyLineupSlot_weeklyLineupId_fkey";

-- DropForeignKey
ALTER TABLE "WeeklyScoreCache" DROP CONSTRAINT "WeeklyScoreCache_leagueMemberId_fkey";

-- DropForeignKey
ALTER TABLE "WeeklyScoreCache" DROP CONSTRAINT "WeeklyScoreCache_scoringRuleId_fkey";

-- DropIndex
DROP INDEX "FantasyTeam_leagueMemberId_key";

-- AlterTable
ALTER TABLE "FantasyTeam" DROP COLUMN "leagueMemberId",
DROP COLUMN "totalScore";

-- AlterTable
ALTER TABLE "RosterSlot" DROP COLUMN "scoreContribution";

-- DropTable
DROP TABLE "ArchivedGameSnapshot";

-- DropTable
DROP TABLE "CommunityEvent";

-- DropTable
DROP TABLE "DailyContest";

-- DropTable
DROP TABLE "DailyEntry";

-- DropTable
DROP TABLE "DailyGameSnapshot";

-- DropTable
DROP TABLE "DemoProfile";

-- DropTable
DROP TABLE "League";

-- DropTable
DROP TABLE "LeagueMatchup";

-- DropTable
DROP TABLE "LeagueMember";

-- DropTable
DROP TABLE "ManagerStanding";

-- DropTable
DROP TABLE "RecurringTournament";

-- DropTable
DROP TABLE "ScoringRule";

-- DropTable
DROP TABLE "ShowcaseJob";

-- DropTable
DROP TABLE "WeeklyLineup";

-- DropTable
DROP TABLE "WeeklyLineupSlot";

-- DropTable
DROP TABLE "WeeklyScoreCache";

-- DropEnum
DROP TYPE "DailyContestMode";

-- DropEnum
DROP TYPE "DailyContestStatus";

-- DropEnum
DROP TYPE "DraftType";

-- DropEnum
DROP TYPE "LeagueStatus";

-- DropEnum
DROP TYPE "LeagueVisibility";

-- DropEnum
DROP TYPE "MatchupStatus";

-- DropEnum
DROP TYPE "RecurringOutcome";

-- DropEnum
DROP TYPE "WeeklyScoreState";
