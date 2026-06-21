-- Migration 038: Role-based sidebar item visibility
-- Controls which sidebar navigation items each role can see

CREATE TABLE IF NOT EXISTS role_sidebar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  module TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role, module)
);

ALTER TABLE role_sidebar_items ENABLE ROW LEVEL SECURITY;

-- Everyone can read their own role's sidebar items
DROP POLICY IF EXISTS "Anyone can read role_sidebar_items" ON role_sidebar_items;
CREATE POLICY "Anyone can read role_sidebar_items" ON role_sidebar_items
  FOR SELECT USING (true);

-- Only super_admin and owner can manage
DROP POLICY IF EXISTS "Super admin and owner can manage role_sidebar_items" ON role_sidebar_items;
CREATE POLICY "Super admin and owner can manage role_sidebar_items" ON role_sidebar_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'super_admin' OR role = 'owner')
    )
  );

-- Helper: get allowed sidebar modules for a given role
CREATE OR REPLACE FUNCTION public.get_role_sidebar_modules(p_role user_role)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY_AGG(module ORDER BY module), '{}')
  FROM role_sidebar_items
  WHERE role = p_role;
$$;

-- Seed default sidebar visibility per role
-- All available sidebar modules
-- dashboard, sales, sales/history, staff, purchases, inventory, customers,
-- suppliers, deliveries, drivers, vehicles, quotations, rentals, expenses,
-- reports, ledgers, audit-log

-- super_admin: all modules
INSERT INTO role_sidebar_items (role, module)
SELECT 'super_admin', m
FROM UNNEST(ARRAY[
  'dashboard', 'sales', 'sales/history', 'staff', 'purchases', 'inventory',
  'customers', 'suppliers', 'deliveries', 'drivers', 'vehicles', 'quotations',
  'rentals', 'expenses', 'reports', 'ledgers'
]) AS m
ON CONFLICT DO NOTHING;

-- owner: all modules
INSERT INTO role_sidebar_items (role, module)
SELECT 'owner', m
FROM UNNEST(ARRAY[
  'dashboard', 'sales', 'sales/history', 'staff', 'purchases', 'inventory',
  'customers', 'suppliers', 'deliveries', 'drivers', 'vehicles', 'quotations',
  'rentals', 'expenses', 'reports', 'ledgers'
]) AS m
ON CONFLICT DO NOTHING;

-- branch_manager: all except staff
INSERT INTO role_sidebar_items (role, module)
SELECT 'branch_manager', m
FROM UNNEST(ARRAY[
  'dashboard', 'sales', 'sales/history', 'purchases', 'inventory',
  'customers', 'suppliers', 'deliveries', 'drivers', 'vehicles', 'quotations',
  'rentals', 'expenses', 'reports', 'ledgers'
]) AS m
ON CONFLICT DO NOTHING;

-- cashier: POS focused
INSERT INTO role_sidebar_items (role, module)
SELECT 'cashier', m
FROM UNNEST(ARRAY[
  'dashboard', 'sales', 'sales/history', 'customers'
]) AS m
ON CONFLICT DO NOTHING;

-- store_keeper: inventory focused
INSERT INTO role_sidebar_items (role, module)
SELECT 'store_keeper', m
FROM UNNEST(ARRAY[
  'dashboard', 'purchases', 'inventory', 'suppliers'
]) AS m
ON CONFLICT DO NOTHING;

-- accountant: financial focused
INSERT INTO role_sidebar_items (role, module)
SELECT 'accountant', m
FROM UNNEST(ARRAY[
  'dashboard', 'expenses', 'reports', 'ledgers', 'customers', 'suppliers'
]) AS m
ON CONFLICT DO NOTHING;

-- sales_executive: sales focused
INSERT INTO role_sidebar_items (role, module)
SELECT 'sales_executive', m
FROM UNNEST(ARRAY[
  'dashboard', 'sales', 'sales/history', 'customers', 'quotations', 'rentals'
]) AS m
ON CONFLICT DO NOTHING;
