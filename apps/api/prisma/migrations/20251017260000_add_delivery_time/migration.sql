-- Add delivery time fields to BoxBroker
ALTER TABLE "public"."BoxBroker" ADD COLUMN "deliveryEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "public"."BoxBroker" ADD COLUMN "deliveryFrom" TEXT;
ALTER TABLE "public"."BoxBroker" ADD COLUMN "deliveryTo" TEXT;
