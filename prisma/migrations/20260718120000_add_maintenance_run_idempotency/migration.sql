CREATE TYPE "MaintenanceRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "maintenance_runs" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "runKey" TEXT NOT NULL,
    "status" "MaintenanceRunStatus" NOT NULL DEFAULT 'RUNNING',
    "result" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "maintenance_runs_jobName_runKey_key"
ON "maintenance_runs"("jobName", "runKey");

CREATE INDEX "maintenance_runs_status_startedAt_idx"
ON "maintenance_runs"("status", "startedAt");
