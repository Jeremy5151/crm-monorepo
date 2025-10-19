-- Update Box table to support multiple countries and timezone
ALTER TABLE "public"."Box" DROP COLUMN IF EXISTS "country";
ALTER TABLE "public"."Box" ADD COLUMN "countries" TEXT[] DEFAULT '{}';
ALTER TABLE "public"."Box" ADD COLUMN "timezone" TEXT DEFAULT 'UTC';

-- Update index
DROP INDEX IF EXISTS "Box_country_idx";
CREATE INDEX "Box_countries_idx" ON "public"."Box" USING GIN ("countries");
