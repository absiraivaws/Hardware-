-- Add credit approval columns to sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS credit_approval_status TEXT DEFAULT 'none';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);

-- Add manager_pin to company_settings
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS manager_pin TEXT DEFAULT '0000';
