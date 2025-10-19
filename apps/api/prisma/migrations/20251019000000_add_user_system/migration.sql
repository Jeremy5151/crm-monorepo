-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('AFFILIATE', 'AFFILIATE_MASTER', 'ADMIN', 'SUPERADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'AFFILIATE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "apiKey" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "language" TEXT NOT NULL DEFAULT 'ru',
    "createdBy" TEXT,
    "parentId" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_apiKey_key" ON "users"("apiKey");

-- CreateIndex
CREATE INDEX "users_apiKey_idx" ON "users"("apiKey");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "Lead_userId_idx" ON "Lead"("userId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default superadmin user
INSERT INTO "users" ("id", "email", "name", "role", "isActive", "apiKey", "timezone", "language", "createdAt", "updatedAt") 
VALUES ('superadmin', 'admin@fleexy.com', 'Super Admin', 'SUPERADMIN', true, 'superadmin-key', 'UTC', 'ru', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
