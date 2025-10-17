/*
  Warnings:

  - You are about to alter the column `email` on the `Lead` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(320)`.
  - You are about to alter the column `phone` on the `Lead` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.

*/
-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "attrs" JSONB,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "ip" VARCHAR(45),
ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmContent" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmSource" TEXT,
ADD COLUMN     "utmTerm" TEXT,
ALTER COLUMN "firstName" DROP NOT NULL,
ALTER COLUMN "email" SET DATA TYPE VARCHAR(320),
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "phone" SET DATA TYPE VARCHAR(50);

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_utmSource_idx" ON "Lead"("utmSource");

-- CreateIndex
CREATE INDEX "Lead_utmMedium_idx" ON "Lead"("utmMedium");

-- CreateIndex
CREATE INDEX "Lead_utmCampaign_idx" ON "Lead"("utmCampaign");
