-- CreateTable
CREATE TABLE "ArchivedGameSnapshot" (
    "id" TEXT NOT NULL,
    "gamePk" INTEGER NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "boxScore" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchivedGameSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArchivedGameSnapshot_gamePk_observedAt_key" ON "ArchivedGameSnapshot"("gamePk", "observedAt");
