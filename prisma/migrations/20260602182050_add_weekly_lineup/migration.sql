-- CreateTable
CREATE TABLE "WeeklyLineup" (
    "id" TEXT NOT NULL,
    "leagueMemberId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "captainExternalPlayerId" INTEGER,
    "lockedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyLineup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyLineupSlot" (
    "id" TEXT NOT NULL,
    "weeklyLineupId" TEXT NOT NULL,
    "externalPlayerId" INTEGER NOT NULL,
    "playerName" TEXT NOT NULL,
    "playerPosition" "PlayerPosition" NOT NULL,
    "playerTeamName" TEXT NOT NULL,
    "playerPhotoUrl" TEXT,
    "slotPosition" "RosterSlotPosition" NOT NULL,
    "salaryAtLock" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyLineupSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyLineup_leagueMemberId_idx" ON "WeeklyLineup"("leagueMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyLineup_leagueMemberId_week_key" ON "WeeklyLineup"("leagueMemberId", "week");

-- CreateIndex
CREATE INDEX "WeeklyLineupSlot_weeklyLineupId_idx" ON "WeeklyLineupSlot"("weeklyLineupId");

-- CreateIndex
CREATE INDEX "WeeklyLineupSlot_externalPlayerId_idx" ON "WeeklyLineupSlot"("externalPlayerId");

-- AddForeignKey
ALTER TABLE "WeeklyLineup" ADD CONSTRAINT "WeeklyLineup_leagueMemberId_fkey" FOREIGN KEY ("leagueMemberId") REFERENCES "LeagueMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyLineupSlot" ADD CONSTRAINT "WeeklyLineupSlot_weeklyLineupId_fkey" FOREIGN KEY ("weeklyLineupId") REFERENCES "WeeklyLineup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
