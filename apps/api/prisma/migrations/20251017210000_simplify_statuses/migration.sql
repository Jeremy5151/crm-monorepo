-- Convert ACCEPTED to SENT (both mean successfully delivered)
UPDATE "public"."Lead" SET "status" = 'SENT' WHERE "status" = 'ACCEPTED';

-- Convert QUEUED to NEW (both mean not yet sent)
UPDATE "public"."Lead" SET "status" = 'NEW' WHERE "status" = 'QUEUED';

-- Remove ACCEPTED and QUEUED from the enum
ALTER TABLE "public"."Lead" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "public"."LeadStatus" RENAME TO "LeadStatus_old";
CREATE TYPE "public"."LeadStatus" AS ENUM ('NEW', 'SENT', 'FAILED');
ALTER TABLE "public"."Lead" ALTER COLUMN "status" TYPE "public"."LeadStatus" USING ("status"::text::"public"."LeadStatus");
ALTER TABLE "public"."Lead" ALTER COLUMN "status" SET DEFAULT 'NEW'::"LeadStatus";
DROP TYPE "public"."LeadStatus_old";

