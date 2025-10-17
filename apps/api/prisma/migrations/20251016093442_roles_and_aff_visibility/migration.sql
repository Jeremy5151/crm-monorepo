-- CreateEnum
CREATE TYPE "Role" AS ENUM ('BUYER', 'ADMIN', 'SUPERUSER');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('SHOW', 'MASK', 'HIDE');

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'BUYER';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "brokerStatus" TEXT,
ADD COLUMN     "brokerStatusChangedAt" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "AffSettings" (
    "aff" TEXT NOT NULL,
    "nameVisibility" "Visibility" NOT NULL DEFAULT 'SHOW',
    "emailVisibility" "Visibility" NOT NULL DEFAULT 'SHOW',
    "phoneVisibility" "Visibility" NOT NULL DEFAULT 'SHOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffSettings_pkey" PRIMARY KEY ("aff")
);

-- CreateTable
CREATE TABLE "LeadStatusEvent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "from" TEXT,
    "to" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadStatusEvent_leadId_createdAt_idx" ON "LeadStatusEvent"("leadId", "createdAt");

-- AddForeignKey
ALTER TABLE "LeadStatusEvent" ADD CONSTRAINT "LeadStatusEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
