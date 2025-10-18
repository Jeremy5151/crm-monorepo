-- CreateTable
CREATE TABLE "Box" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Box_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoxBroker" (
    "id" TEXT NOT NULL,
    "boxId" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoxBroker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Box_country_idx" ON "Box"("country");

-- CreateIndex
CREATE INDEX "BoxBroker_boxId_priority_idx" ON "BoxBroker"("boxId", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "BoxBroker_boxId_brokerId_key" ON "BoxBroker"("boxId", "brokerId");

-- CreateIndex
CREATE UNIQUE INDEX "BoxBroker_boxId_priority_key" ON "BoxBroker"("boxId", "priority");

-- AddForeignKey
ALTER TABLE "BoxBroker" ADD CONSTRAINT "BoxBroker_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "Box"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoxBroker" ADD CONSTRAINT "BoxBroker_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "BrokerTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

