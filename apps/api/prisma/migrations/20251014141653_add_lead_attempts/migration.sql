-- CreateTable
CREATE TABLE "LeadBrokerAttempt" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "broker" TEXT NOT NULL,
    "attemptNo" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "responseCode" INTEGER,
    "responseBody" TEXT,
    "errorCode" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadBrokerAttempt_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LeadBrokerAttempt" ADD CONSTRAINT "LeadBrokerAttempt_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
