ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS google_drive_refresh_token TEXT DEFAULT '';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS google_drive_email TEXT DEFAULT '';
