-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "brokerResp" JSONB,
ADD COLUMN     "sentAt" TIMESTAMPTZ(3);
