-- Add WhatsApp Business API fields
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS whatsapp_api_key TEXT DEFAULT '';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT DEFAULT '';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS whatsapp_business_account_id TEXT DEFAULT '';
