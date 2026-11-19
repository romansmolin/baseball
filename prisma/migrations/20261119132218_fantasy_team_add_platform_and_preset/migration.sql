/*
  Warnings:

  - You are about to drop the column `format` on the `FantasyTeam` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "FantasyPlatform" AS ENUM ('YAHOO', 'ESPN', 'OTHER');

-- CreateEnum
CREATE TYPE "ScoringPreset" AS ENUM ('POINTS', 'CATEGORIES_5X5');

-- AlterTable
ALTER TABLE "FantasyTeam" DROP COLUMN "format",
ADD COLUMN     "platform" "FantasyPlatform" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "scoringPreset" "ScoringPreset" NOT NULL DEFAULT 'POINTS';
