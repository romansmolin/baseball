/*
  Warnings:

  - Added the required column `leagueSlug` to the `Contest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Contest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Contest" ADD COLUMN     "leagueSlug" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Contest_leagueSlug_status_startAt_idx" ON "Contest"("leagueSlug", "status", "startAt");
