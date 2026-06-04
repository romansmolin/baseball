/*
  Warnings:

  - Added the required column `leagueSlug` to the `FantasyTeam` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `FantasyTeam` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FantasyTeam" ADD COLUMN     "captainExternalPlayerId" INTEGER,
ADD COLUMN     "format" TEXT,
ADD COLUMN     "leagueSlug" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "FantasyTeam_leagueSlug_idx" ON "FantasyTeam"("leagueSlug");
