-- CreateEnum
CREATE TYPE "AIUsageStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ContestType" AS ENUM ('GUARANTEED', 'HEAD_TO_HEAD', 'TOURNAMENT', 'FIFTY_FIFTY');

-- CreateEnum
CREATE TYPE "ContestFormat" AS ENUM ('SALARY_CAP', 'SNAKE_DRAFT');

-- CreateEnum
CREATE TYPE "ContestStatus" AS ENUM ('UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContestEntryStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('PURCHASE', 'REFUND', 'CONTEST_ENTRY_FEE', 'CONTEST_WINNINGS', 'AI_USAGE', 'ADMIN_GRANT', 'ADMIN_DEDUCT');

-- CreateEnum
CREATE TYPE "CreditTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PlayerPosition" AS ENUM ('P', 'C', 'FIRST_BASE', 'SECOND_BASE', 'THIRD_BASE', 'SS', 'LF', 'CF', 'RF', 'DH', 'OF', 'IF', 'UTIL');

-- CreateEnum
CREATE TYPE "RosterSlotPosition" AS ENUM ('P', 'C', 'FIRST_BASE', 'SECOND_BASE', 'THIRD_BASE', 'SS', 'OF', 'UTIL', 'BENCH');

-- CreateEnum
CREATE TYPE "DraftType" AS ENUM ('SNAKE', 'AUCTION', 'AUTO');

-- CreateEnum
CREATE TYPE "LeagueStatus" AS ENUM ('DRAFTING', 'IN_SEASON', 'PLAYOFFS', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MatchupStatus" AS ENUM ('SCHEDULED', 'LIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'COMMISSIONER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER',
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "AIFeature" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "costCredits" INTEGER NOT NULL,
    "modelName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "costCredits" INTEGER NOT NULL,
    "transactionId" TEXT,
    "status" "AIUsageStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiCacheEntry" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiCacheEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contest" (
    "id" TEXT NOT NULL,
    "scoringRuleId" TEXT NOT NULL,
    "type" "ContestType" NOT NULL,
    "format" "ContestFormat" NOT NULL,
    "status" "ContestStatus" NOT NULL,
    "entryFeeCredits" INTEGER NOT NULL,
    "prizePoolCredits" INTEGER NOT NULL,
    "salaryCap" INTEGER NOT NULL,
    "lineupLockAt" TIMESTAMP(3) NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestSlateGame" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "externalGameId" INTEGER NOT NULL,
    "homeTeamName" TEXT NOT NULL,
    "awayTeamName" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestSlateGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestEntry" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "finalScore" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "finalRank" INTEGER,
    "prizeWon" INTEGER NOT NULL DEFAULT 0,
    "status" "ContestEntryStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestPayout" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "rankFrom" INTEGER NOT NULL,
    "rankTo" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "status" "CreditTransactionStatus" NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FantasyTeam" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contestEntryId" TEXT,
    "leagueMemberId" TEXT,
    "totalScore" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FantasyTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosterSlot" (
    "id" TEXT NOT NULL,
    "fantasyTeamId" TEXT NOT NULL,
    "externalPlayerId" INTEGER NOT NULL,
    "playerName" TEXT NOT NULL,
    "playerPosition" "PlayerPosition" NOT NULL,
    "playerTeamName" TEXT NOT NULL,
    "playerPhotoUrl" TEXT,
    "slotPosition" "RosterSlotPosition" NOT NULL,
    "salaryAtLock" INTEGER NOT NULL,
    "scoreContribution" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RosterSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "commissionerId" TEXT NOT NULL,
    "scoringRuleId" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "externalSeasonId" INTEGER NOT NULL,
    "status" "LeagueStatus" NOT NULL,
    "draftType" "DraftType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueMember" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueMatchup" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "teamAId" TEXT NOT NULL,
    "teamBId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "teamAScore" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "teamBScore" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "MatchupStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueMatchup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "rules" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoringRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIFeature_key_key" ON "AIFeature"("key");

-- CreateIndex
CREATE INDEX "AIUsageLog_userId_idx" ON "AIUsageLog"("userId");

-- CreateIndex
CREATE INDEX "AIUsageLog_featureId_idx" ON "AIUsageLog"("featureId");

-- CreateIndex
CREATE INDEX "AIUsageLog_transactionId_idx" ON "AIUsageLog"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiCacheEntry_cacheKey_key" ON "ApiCacheEntry"("cacheKey");

-- CreateIndex
CREATE INDEX "ApiCacheEntry_expiresAt_idx" ON "ApiCacheEntry"("expiresAt");

-- CreateIndex
CREATE INDEX "Contest_scoringRuleId_idx" ON "Contest"("scoringRuleId");

-- CreateIndex
CREATE INDEX "Contest_status_startAt_idx" ON "Contest"("status", "startAt");

-- CreateIndex
CREATE INDEX "ContestSlateGame_contestId_idx" ON "ContestSlateGame"("contestId");

-- CreateIndex
CREATE INDEX "ContestSlateGame_externalGameId_idx" ON "ContestSlateGame"("externalGameId");

-- CreateIndex
CREATE INDEX "ContestEntry_contestId_idx" ON "ContestEntry"("contestId");

-- CreateIndex
CREATE INDEX "ContestEntry_userId_idx" ON "ContestEntry"("userId");

-- CreateIndex
CREATE INDEX "ContestEntry_contestId_finalRank_idx" ON "ContestEntry"("contestId", "finalRank");

-- CreateIndex
CREATE INDEX "ContestPayout_contestId_idx" ON "ContestPayout"("contestId");

-- CreateIndex
CREATE INDEX "CreditTransaction_userId_idx" ON "CreditTransaction"("userId");

-- CreateIndex
CREATE INDEX "CreditTransaction_userId_createdAt_idx" ON "CreditTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditTransaction_referenceType_referenceId_idx" ON "CreditTransaction"("referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "FantasyTeam_contestEntryId_key" ON "FantasyTeam"("contestEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "FantasyTeam_leagueMemberId_key" ON "FantasyTeam"("leagueMemberId");

-- CreateIndex
CREATE INDEX "FantasyTeam_userId_idx" ON "FantasyTeam"("userId");

-- CreateIndex
CREATE INDEX "RosterSlot_fantasyTeamId_idx" ON "RosterSlot"("fantasyTeamId");

-- CreateIndex
CREATE INDEX "RosterSlot_externalPlayerId_idx" ON "RosterSlot"("externalPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "League_inviteCode_key" ON "League"("inviteCode");

-- CreateIndex
CREATE INDEX "League_commissionerId_idx" ON "League"("commissionerId");

-- CreateIndex
CREATE INDEX "League_scoringRuleId_idx" ON "League"("scoringRuleId");

-- CreateIndex
CREATE INDEX "LeagueMember_leagueId_idx" ON "LeagueMember"("leagueId");

-- CreateIndex
CREATE INDEX "LeagueMember_userId_idx" ON "LeagueMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueMember_leagueId_userId_key" ON "LeagueMember"("leagueId", "userId");

-- CreateIndex
CREATE INDEX "LeagueMatchup_leagueId_idx" ON "LeagueMatchup"("leagueId");

-- CreateIndex
CREATE INDEX "LeagueMatchup_teamAId_idx" ON "LeagueMatchup"("teamAId");

-- CreateIndex
CREATE INDEX "LeagueMatchup_teamBId_idx" ON "LeagueMatchup"("teamBId");

-- CreateIndex
CREATE INDEX "LeagueMatchup_leagueId_week_idx" ON "LeagueMatchup"("leagueId", "week");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringRule_name_version_key" ON "ScoringRule"("name", "version");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Account_providerId_accountId_idx" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- AddForeignKey
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "AIFeature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_scoringRuleId_fkey" FOREIGN KEY ("scoringRuleId") REFERENCES "ScoringRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestSlateGame" ADD CONSTRAINT "ContestSlateGame_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestPayout" ADD CONSTRAINT "ContestPayout_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FantasyTeam" ADD CONSTRAINT "FantasyTeam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FantasyTeam" ADD CONSTRAINT "FantasyTeam_contestEntryId_fkey" FOREIGN KEY ("contestEntryId") REFERENCES "ContestEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FantasyTeam" ADD CONSTRAINT "FantasyTeam_leagueMemberId_fkey" FOREIGN KEY ("leagueMemberId") REFERENCES "LeagueMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterSlot" ADD CONSTRAINT "RosterSlot_fantasyTeamId_fkey" FOREIGN KEY ("fantasyTeamId") REFERENCES "FantasyTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_commissionerId_fkey" FOREIGN KEY ("commissionerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_scoringRuleId_fkey" FOREIGN KEY ("scoringRuleId") REFERENCES "ScoringRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMatchup" ADD CONSTRAINT "LeagueMatchup_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMatchup" ADD CONSTRAINT "LeagueMatchup_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "LeagueMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMatchup" ADD CONSTRAINT "LeagueMatchup_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "LeagueMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
