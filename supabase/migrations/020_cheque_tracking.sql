-- Add cheque status to sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cheque_status TEXT DEFAULT 'pending'
  CHECK (cheque_status IN ('pending', 'cleared', 'bounced'));
