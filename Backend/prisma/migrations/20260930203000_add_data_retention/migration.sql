CREATE TABLE "MaintenanceJob" (
  "id" TEXT NOT NULL,
  "lastRunAt" TIMESTAMP(3),
  "leaseUntil" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaintenanceJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Check_checkedAt_idx" ON "Check"("checkedAt");
CREATE INDEX "Incident_resolvedAt_idx" ON "Incident"("resolvedAt");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");
