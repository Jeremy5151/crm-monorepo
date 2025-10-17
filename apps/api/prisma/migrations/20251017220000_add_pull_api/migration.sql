-- Add Pull API fields to BrokerTemplate
ALTER TABLE "public"."BrokerTemplate" ADD COLUMN "pullEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "public"."BrokerTemplate" ADD COLUMN "pullUrl" TEXT;
ALTER TABLE "public"."BrokerTemplate" ADD COLUMN "pullMethod" TEXT DEFAULT 'POST';
ALTER TABLE "public"."BrokerTemplate" ADD COLUMN "pullHeaders" JSONB;
ALTER TABLE "public"."BrokerTemplate" ADD COLUMN "pullBody" TEXT;
ALTER TABLE "public"."BrokerTemplate" ADD COLUMN "pullInterval" INTEGER DEFAULT 15;
ALTER TABLE "public"."BrokerTemplate" ADD COLUMN "pullLastSync" TIMESTAMP(3);

