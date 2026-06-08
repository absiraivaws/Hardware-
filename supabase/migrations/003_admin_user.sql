-- HardPro ERP - Create admin user and profile
-- Run via: supabase db push

-- Confirm the admin user's email (via function to bypass generated column restrictions)
CREATE OR REPLACE FUNCTION confirm_admin_user()
RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE auth.users
  SET 
    email_confirmed_at = NOW(),
    updated_at = NOW()
  WHERE email = 'admin@hardpro.com' AND email_confirmed_at IS NULL;
END;
$$;

SELECT confirm_admin_user();
DROP FUNCTION IF EXISTS confirm_admin_user();

-- Create profile for admin user
INSERT INTO profiles (id, email, full_name, role, branch_id)
SELECT 
  id, 
  email, 
  'Admin', 
  'owner'::user_role,
  (SELECT id FROM branches WHERE code = 'MAIN')
FROM auth.users 
WHERE email = 'admin@hardpro.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  branch_id = EXCLUDED.branch_id;
