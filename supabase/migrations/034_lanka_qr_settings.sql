-- Add Lanka QR merchant configuration fields to company_settings
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS lanka_qr_merchant_id TEXT DEFAULT '';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS lanka_qr_terminal_id TEXT DEFAULT '';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS lanka_qr_mcc TEXT DEFAULT '';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS lanka_qr_bank_code TEXT DEFAULT '';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS lanka_qr_merchant_name TEXT DEFAULT '';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS lanka_qr_merchant_city TEXT DEFAULT '';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS lanka_qr_currency_code TEXT DEFAULT '144';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS lanka_qr_country_code TEXT DEFAULT 'LK';
