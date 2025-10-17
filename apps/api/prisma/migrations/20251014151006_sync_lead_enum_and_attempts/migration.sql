/*
  Warnings:

  - You are about to drop the column `fullName` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `Lead` table. All the data in the column will be lost.
  - You are about to alter the column `country` on the `Lead` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Char(2)`.

*/
-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "fullName",
DROP COLUMN "source",
ADD COLUMN     "aff" TEXT,
ADD COLUMN     "bx" TEXT,
ADD COLUMN     "clickid" TEXT,
ADD COLUMN     "comment" TEXT,
ADD COLUMN     "funnel" TEXT,
ADD COLUMN     "lang" TEXT,
ADD COLUMN     "url" TEXT,
ADD COLUMN     "useragent" TEXT,
ALTER COLUMN "country" SET DATA TYPE CHAR(2);

-- CreateIndex
CREATE INDEX "Lead_aff_idx" ON "Lead"("aff");

-- CreateIndex
CREATE INDEX "Lead_bx_idx" ON "Lead"("bx");

-- CreateIndex
CREATE INDEX "LeadBrokerAttempt_leadId_createdAt_idx" ON "LeadBrokerAttempt"("leadId", "createdAt");
