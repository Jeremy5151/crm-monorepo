-- CreateTable
CREATE TABLE "BrokerTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "method" TEXT NOT NULL DEFAULT 'POST',
    "url" TEXT NOT NULL,
    "headers" JSONB,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrokerTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrokerTemplate_code_key" ON "BrokerTemplate"("code");
