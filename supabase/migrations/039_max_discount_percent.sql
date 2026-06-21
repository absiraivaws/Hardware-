-- Migration 039: Add max_discount_percent to company_settings
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS max_discount_percent NUMERIC NOT NULL DEFAULT 25;
