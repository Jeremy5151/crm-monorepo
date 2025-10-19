-- Remove timezone from Box table
ALTER TABLE "public"."Box" DROP COLUMN IF EXISTS "timezone";

-- Create CrmSettings table
CREATE TABLE "public"."crm_settings" (
    "id" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_settings_pkey" PRIMARY KEY ("id")
);

-- Insert default settings
INSERT INTO "public"."crm_settings" ("id", "timezone") VALUES ('default', 'UTC');
