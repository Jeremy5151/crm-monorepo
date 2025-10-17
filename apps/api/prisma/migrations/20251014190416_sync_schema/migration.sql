-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_externalId_idx" ON "Lead"("externalId");

-- CreateIndex
CREATE INDEX "Lead_aff_createdAt_idx" ON "Lead"("aff", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_bx_createdAt_idx" ON "Lead"("bx", "createdAt");
