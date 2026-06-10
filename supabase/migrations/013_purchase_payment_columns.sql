-- Add payment-related columns to purchase_orders
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_type TEXT,
  ADD COLUMN IF NOT EXISTS payment_details JSONB DEFAULT '{}'::jsonb;
