-- Step 1: Create a new Box table with Int id
CREATE TABLE "Box_new" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "countries" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Box_new_pkey" PRIMARY KEY ("id")
);

-- Step 2: Copy data from old Box to new Box, assigning sequential IDs
INSERT INTO "Box_new" ("name", "countries", "isActive", "createdAt", "updatedAt")
SELECT "name", "countries", "isActive", "createdAt", "updatedAt"
FROM "Box"
ORDER BY "createdAt";

-- Step 3: Create mapping table to track old ID -> new ID
CREATE TEMP TABLE box_id_mapping AS
SELECT 
    old.id AS old_id,
    new.id AS new_id
FROM "Box" old
JOIN "Box_new" new ON old."name" = new."name" AND old."createdAt" = new."createdAt"
ORDER BY new.id;

-- Step 4: Create new BoxBroker table with Int boxId
CREATE TABLE "BoxBroker_new" (
    "id" TEXT NOT NULL,
    "boxId" INTEGER NOT NULL,
    "brokerId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "deliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "deliveryFrom" TEXT,
    "deliveryTo" TEXT,
    "leadCap" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoxBroker_new_pkey" PRIMARY KEY ("id")
);

-- Step 5: Copy BoxBroker data with mapped boxId
INSERT INTO "BoxBroker_new" ("id", "boxId", "brokerId", "priority", "deliveryEnabled", "deliveryFrom", "deliveryTo", "leadCap", "createdAt")
SELECT 
    bb."id",
    mapping.new_id AS "boxId",
    bb."brokerId",
    bb."priority",
    bb."deliveryEnabled",
    bb."deliveryFrom",
    bb."deliveryTo",
    bb."leadCap",
    bb."createdAt"
FROM "BoxBroker" bb
JOIN box_id_mapping mapping ON bb."boxId" = mapping.old_id;

-- Step 6: Update Lead.bx to use new box IDs
-- First, add a new column for Int
ALTER TABLE "Lead" ADD COLUMN "bx_int" INTEGER;

-- Update it with mapped values
UPDATE "Lead"
SET "bx_int" = mapping.new_id
FROM box_id_mapping mapping
WHERE "Lead"."bx" = mapping.old_id;

-- Drop old bx column and rename new one
ALTER TABLE "Lead" DROP COLUMN "bx";
ALTER TABLE "Lead" RENAME COLUMN "bx_int" TO "bx";

-- Step 7: Drop old tables
DROP TABLE "BoxBroker";
DROP TABLE "Box";

-- Step 8: Rename new tables
ALTER TABLE "Box_new" RENAME TO "Box";
ALTER TABLE "BoxBroker_new" RENAME TO "BoxBroker";

-- Step 9: Recreate indexes and constraints
CREATE INDEX "Box_countries_idx" ON "Box"("countries");
CREATE UNIQUE INDEX "BoxBroker_boxId_brokerId_key" ON "BoxBroker"("boxId", "brokerId");
CREATE INDEX "BoxBroker_boxId_priority_idx" ON "BoxBroker"("boxId", "priority");
CREATE UNIQUE INDEX "BoxBroker_boxId_priority_key" ON "BoxBroker"("boxId", "priority");
ALTER TABLE "BoxBroker" ADD CONSTRAINT "BoxBroker_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "Box"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoxBroker" ADD CONSTRAINT "BoxBroker_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "BrokerTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Lead_bx_idx" ON "Lead"("bx");
CREATE INDEX "Lead_bx_createdAt_idx" ON "Lead"("bx", "createdAt");

