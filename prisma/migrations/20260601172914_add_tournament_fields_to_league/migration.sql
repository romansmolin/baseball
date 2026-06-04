/*
  Warnings:

  - Added the required column `endsAt` to the `League` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leagueSlug` to the `League` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `League` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startsAt` to the `League` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalWeeks` to the `League` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LeagueVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "League" ADD COLUMN     "endsAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "entryFeeCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "leagueSlug" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "prizePoolCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startsAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "totalWeeks" INTEGER NOT NULL,
ADD COLUMN     "visibility" "LeagueVisibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateIndex
CREATE INDEX "League_visibility_status_startsAt_idx" ON "League"("visibility", "status", "startsAt");

-- CreateIndex
CREATE INDEX "League_leagueSlug_status_idx" ON "League"("leagueSlug", "status");
