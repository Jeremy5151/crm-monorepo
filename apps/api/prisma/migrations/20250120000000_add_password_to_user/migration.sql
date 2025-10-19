-- AddPasswordToUser
ALTER TABLE "User" ADD COLUMN "password" TEXT NOT NULL DEFAULT 'temp_password';

-- Update existing users with a default password (they should change it)
UPDATE "User" SET "password" = 'changeme123' WHERE "password" = 'temp_password';

-- Remove the default value
ALTER TABLE "User" ALTER COLUMN "password" DROP DEFAULT;
