CREATE TABLE "DemoReportJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fileBase64" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DemoReportJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DemoReportJob_userId_createdAt_idx" ON "DemoReportJob"("userId", "createdAt");
