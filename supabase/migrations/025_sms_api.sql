-- Add SMS API fields
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS sms_provider TEXT DEFAULT '';  -- 'dialog' or 'mobitel'
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS sms_api_key TEXT DEFAULT '';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS sms_api_secret TEXT DEFAULT '';
