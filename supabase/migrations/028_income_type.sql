-- Add 'income' to ledger_type enum
ALTER TYPE ledger_type ADD VALUE IF NOT EXISTS 'income';
