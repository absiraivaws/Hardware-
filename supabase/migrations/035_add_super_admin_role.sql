-- Add super_admin to user_role enum (must be in its own migration)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
