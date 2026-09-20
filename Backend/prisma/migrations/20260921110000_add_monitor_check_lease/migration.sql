-- AlterTable
ALTER TABLE "Monitor" ADD COLUMN "checkLeaseUntil" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Monitor_checkLeaseUntil_idx" ON "Monitor"("checkLeaseUntil");
