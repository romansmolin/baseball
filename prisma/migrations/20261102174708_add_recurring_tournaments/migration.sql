-- CreateEnum
CREATE TYPE "RecurringOutcome" AS ENUM ('STANDARD', 'VOID');

-- AlterEnum
ALTER TYPE "LeagueStatus" ADD VALUE 'CANCELLED';

-- CreateTable
CREATE TABLE "RecurringTournament" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "sourceSlug" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "configurationVersion" INTEGER NOT NULL DEFAULT 1,
    "games" JSONB NOT NULL,
    "playerPool" JSONB NOT NULL,
    "demoTarget" INTEGER NOT NULL,
    "outcome" "RecurringOutcome" NOT NULL DEFAULT 'STANDARD',
    "sourceCheckedAt" TIMESTAMP(3) NOT NULL,
    "lastScoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringTournament_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecurringTournament_leagueId_key" ON "RecurringTournament"("leagueId");

-- CreateIndex
CREATE INDEX "RecurringTournament_lastScoredAt_idx" ON "RecurringTournament"("lastScoredAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringTournament_templateKey_sourceSlug_startsAt_key" ON "RecurringTournament"("templateKey", "sourceSlug", "startsAt");

-- AddForeignKey
ALTER TABLE "RecurringTournament" ADD CONSTRAINT "RecurringTournament_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;
