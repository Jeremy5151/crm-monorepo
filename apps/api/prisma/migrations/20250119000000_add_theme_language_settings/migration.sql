-- Add theme and language fields to crm_settings table
ALTER TABLE "crm_settings" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'light';
ALTER TABLE "crm_settings" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'ru';
