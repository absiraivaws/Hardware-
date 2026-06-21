-- Add new columns to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS nic TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS handphone TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
