-- Add password generation settings to BrokerTemplate
ALTER TABLE "public"."BrokerTemplate" ADD COLUMN "passwordLength" INTEGER DEFAULT 8;
ALTER TABLE "public"."BrokerTemplate" ADD COLUMN "passwordUseUpper" BOOLEAN DEFAULT true;
ALTER TABLE "public"."BrokerTemplate" ADD COLUMN "passwordUseLower" BOOLEAN DEFAULT true;
ALTER TABLE "public"."BrokerTemplate" ADD COLUMN "passwordUseDigits" BOOLEAN DEFAULT true;
ALTER TABLE "public"."BrokerTemplate" ADD COLUMN "passwordUseSpecial" BOOLEAN DEFAULT true;
ALTER TABLE "public"."BrokerTemplate" ADD COLUMN "passwordSpecialChars" TEXT DEFAULT '!@#$%';

