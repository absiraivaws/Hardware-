-- Opening balance columns for cash and bank ledgers
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS cash_opening_balance NUMERIC NOT NULL DEFAULT 10000;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS bank_opening_balance NUMERIC NOT NULL DEFAULT 10000;
