-- Add business_type, rent_calculation, and timezone to company_settings
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'sale';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS rent_calculation TEXT NOT NULL DEFAULT 'days';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Colombo';

-- Add rent_calculation and start_datetime to rentals for hours mode support
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS start_datetime TIMESTAMPTZ;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS rent_calculation TEXT NOT NULL DEFAULT 'days';

-- Add return financial fields to rentals
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS return_labour_charge NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS return_other_charges NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS return_damage_cost NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS return_tax_type TEXT NOT NULL DEFAULT 'non_vat';
