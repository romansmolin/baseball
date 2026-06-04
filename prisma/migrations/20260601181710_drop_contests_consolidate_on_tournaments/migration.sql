-- AlterEnum
BEGIN;
CREATE TYPE "CreditTransactionType_new" AS ENUM ('PURCHASE', 'REFUND', 'TOURNAMENT_ENTRY_FEE', 'TOURNAMENT_WINNINGS', 'AI_USAGE', 'ADMIN_GRANT', 'ADMIN_DEDUCT');
ALTER TABLE "CreditTransaction" ALTER COLUMN "type" TYPE "CreditTransactionType_new" USING ("type"::text::"CreditTransactionType_new");
ALTER TYPE "CreditTransactionType" RENAME TO "CreditTransactionType_old";
ALTER TYPE "CreditTransactionType_new" RENAME TO "CreditTransactionType";
DROP TYPE "public"."CreditTransactionType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Contest" DROP CONSTRAINT "Contest_scoringRuleId_fkey";

-- DropForeignKey
ALTER TABLE "ContestEntry" DROP CONSTRAINT "ContestEntry_contestId_fkey";

-- DropForeignKey
ALTER TABLE "ContestEntry" DROP CONSTRAINT "ContestEntry_userId_fkey";

-- DropForeignKey
ALTER TABLE "ContestPayout" DROP CONSTRAINT "ContestPayout_contestId_fkey";

-- DropForeignKey
ALTER TABLE "ContestSlateGame" DROP CONSTRAINT "ContestSlateGame_contestId_fkey";

-- DropForeignKey
ALTER TABLE "FantasyTeam" DROP CONSTRAINT "FantasyTeam_contestEntryId_fkey";

-- DropIndex
DROP INDEX "FantasyTeam_contestEntryId_key";

-- AlterTable
ALTER TABLE "FantasyTeam" DROP COLUMN "contestEntryId";

-- DropTable
DROP TABLE "Contest";

-- DropTable
DROP TABLE "ContestEntry";

-- DropTable
DROP TABLE "ContestPayout";

-- DropTable
DROP TABLE "ContestSlateGame";

-- DropEnum
DROP TYPE "ContestEntryStatus";

-- DropEnum
DROP TYPE "ContestFormat";

-- DropEnum
DROP TYPE "ContestStatus";

-- DropEnum
DROP TYPE "ContestType";
