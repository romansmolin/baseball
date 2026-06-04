-- CreateEnum
CREATE TYPE "WeeklyScoreState" AS ENUM ('PARTIAL', 'FINAL');

-- CreateTable
CREATE TABLE "WeeklyScoreCache" (
    "id" TEXT NOT NULL,
    "leagueMemberId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "points" DECIMAL(10,2) NOT NULL,
    "state" "WeeklyScoreState" NOT NULL DEFAULT 'PARTIAL',
    "staleAt" TIMESTAMP(3) NOT NULL,
    "breakdown" JSONB NOT NULL,
    "scoringRuleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyScoreCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyScoreCache_staleAt_idx" ON "WeeklyScoreCache"("staleAt");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyScoreCache_leagueMemberId_week_key" ON "WeeklyScoreCache"("leagueMemberId", "week");

-- AddForeignKey
ALTER TABLE "WeeklyScoreCache" ADD CONSTRAINT "WeeklyScoreCache_leagueMemberId_fkey" FOREIGN KEY ("leagueMemberId") REFERENCES "LeagueMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyScoreCache" ADD CONSTRAINT "WeeklyScoreCache_scoringRuleId_fkey" FOREIGN KEY ("scoringRuleId") REFERENCES "ScoringRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
