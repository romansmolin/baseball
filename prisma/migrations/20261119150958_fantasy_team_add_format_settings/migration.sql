-- CreateEnum
CREATE TYPE "FantasyFormat" AS ENUM ('H2H_POINTS', 'H2H_CATEGORIES', 'ROTO', 'DFS');

-- CreateEnum
CREATE TYPE "ForecastPeriod" AS ENUM ('DAY', 'WEEK', 'SEASON');

-- CreateEnum
CREATE TYPE "LineupChanges" AS ENUM ('DAILY', 'WEEKLY');

-- AlterTable
ALTER TABLE "FantasyTeam" ADD COLUMN     "forecastPeriod" "ForecastPeriod" NOT NULL DEFAULT 'WEEK',
ADD COLUMN     "format" "FantasyFormat" NOT NULL DEFAULT 'H2H_POINTS',
ADD COLUMN     "lineupChanges" "LineupChanges" NOT NULL DEFAULT 'DAILY',
ADD COLUMN     "salaryCap" INTEGER,
ADD COLUMN     "scoringRules" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "slotConfig" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "RosterSlot" ADD COLUMN     "slotIndex" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "salaryAtLock" DROP NOT NULL;
