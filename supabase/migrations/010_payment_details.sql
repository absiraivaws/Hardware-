-- Add payment_details JSONB column to sales table for storing
-- cheque info (cheque_number, bank_code, account_number) and
-- bank_transfer info (from_account, to_account)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_details JSONB DEFAULT '{}'::jsonb;
