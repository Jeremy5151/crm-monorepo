-- Update existing REJECTED leads to FAILED
UPDATE "public"."Lead" SET "status" = 'FAILED' WHERE "status" = 'REJECTED';

-- Remove REJECTED from the enum
ALTER TABLE "public"."Lead" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "public"."LeadStatus" RENAME TO "LeadStatus_old";
CREATE TYPE "public"."LeadStatus" AS ENUM ('NEW', 'QUEUED', 'SENT', 'FAILED', 'ACCEPTED');
ALTER TABLE "public"."Lead" ALTER COLUMN "status" TYPE "public"."LeadStatus" USING ("status"::text::"public"."LeadStatus");
ALTER TABLE "public"."Lead" ALTER COLUMN "status" SET DEFAULT 'NEW'::"LeadStatus";
DROP TYPE "public"."LeadStatus_old";

