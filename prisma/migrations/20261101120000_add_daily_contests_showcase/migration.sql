-- CreateEnum
CREATE TYPE "DailyContestMode" AS ENUM ('LIVE', 'REPLAY');

-- CreateEnum
CREATE TYPE "DailyContestStatus" AS ENUM ('OPEN', 'LOCKED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "DailyContest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "DailyContestMode" NOT NULL,
    "status" "DailyContestStatus" NOT NULL DEFAULT 'OPEN',
    "leagueSlug" TEXT NOT NULL,
    "contestDate" TEXT NOT NULL,
    "sourceDate" TEXT NOT NULL,
    "slateKey" TEXT NOT NULL DEFAULT 'classic',
    "locksAt" TIMESTAMP(3) NOT NULL,
    "salaryCap" INTEGER NOT NULL DEFAULT 80000,
    "captainMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "scoringRule" JSONB NOT NULL,
    "games" JSONB NOT NULL,
    "playerPool" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyContest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyEntry" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "captainExternalPlayerId" INTEGER,
    "lineup" JSONB NOT NULL,
    "points" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyGameSnapshot" (
    "gamePk" INTEGER NOT NULL,
    "leagueSlug" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "boxScore" JSONB,
    "complete" BOOLEAN NOT NULL DEFAULT false,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyGameSnapshot_pkey" PRIMARY KEY ("gamePk")
);

-- CreateTable
CREATE TABLE "DemoProfile" (
    "userId" TEXT NOT NULL,
    "demoKey" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "favoriteTeamId" INTEGER NOT NULL,
    "strategy" TEXT NOT NULL,
    "datasetSeed" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "CommunityEvent" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "userId" TEXT,
    "contestId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "CommunityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagerStanding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "DailyContestMode" NOT NULL,
    "period" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "points" DECIMAL(12,2) NOT NULL,
    "rank" INTEGER NOT NULL,
    "previousRank" INTEGER,
    "entries" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagerStanding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowcaseJob" (
    "key" TEXT NOT NULL,
    "cursor" JSONB,
    "leaseToken" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShowcaseJob_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "DailyContest_status_locksAt_idx" ON "DailyContest"("status", "locksAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyContest_mode_leagueSlug_contestDate_slateKey_key" ON "DailyContest"("mode", "leagueSlug", "contestDate", "slateKey");

-- CreateIndex
CREATE INDEX "DailyEntry_userId_createdAt_idx" ON "DailyEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DailyEntry_contestId_points_idx" ON "DailyEntry"("contestId", "points");

-- CreateIndex
CREATE UNIQUE INDEX "DailyEntry_contestId_userId_key" ON "DailyEntry"("contestId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "DemoProfile_demoKey_key" ON "DemoProfile"("demoKey");

-- CreateIndex
CREATE UNIQUE INDEX "DemoProfile_datasetSeed_ordinal_key" ON "DemoProfile"("datasetSeed", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityEvent_sourceKey_key" ON "CommunityEvent"("sourceKey");

-- CreateIndex
CREATE INDEX "CommunityEvent_occurredAt_id_idx" ON "CommunityEvent"("occurredAt", "id");

-- CreateIndex
CREATE INDEX "ManagerStanding_mode_period_periodKey_rank_idx" ON "ManagerStanding"("mode", "period", "periodKey", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "ManagerStanding_userId_mode_period_periodKey_key" ON "ManagerStanding"("userId", "mode", "period", "periodKey");

-- AddForeignKey
ALTER TABLE "DailyEntry" ADD CONSTRAINT "DailyEntry_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "DailyContest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyEntry" ADD CONSTRAINT "DailyEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoProfile" ADD CONSTRAINT "DemoProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityEvent" ADD CONSTRAINT "CommunityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityEvent" ADD CONSTRAINT "CommunityEvent_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "DailyContest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerStanding" ADD CONSTRAINT "ManagerStanding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

