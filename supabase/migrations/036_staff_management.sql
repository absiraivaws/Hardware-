-- Staff Management & User Access Control Module
-- Adds: staff fields to profiles, permissions, role_permissions, audit_log

-- Add columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS staff_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'inactive', 'suspended', 'pending')) DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module, action)
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- Insert permissions (module, action, label)
INSERT INTO permissions (module, action, label) VALUES
  ('dashboard', 'view', 'View Dashboard'),
  ('dashboard', 'view_branch_wise', 'View Branch-wise Dashboard'),
  ('dashboard', 'view_financial_kpi', 'View Financial KPIs'),
  ('pos', 'view', 'View POS'),
  ('pos', 'create_sale', 'Create Sale'),
  ('pos', 'void_sale', 'Void Sale'),
  ('pos', 'discount_up_to_10', 'Discount up to 10%'),
  ('pos', 'discount_up_to_25', 'Discount up to 25%'),
  ('pos', 'approve_credit', 'Approve Credit Sales'),
  ('purchases', 'view', 'View Purchases'),
  ('purchases', 'create_po', 'Create Purchase Order'),
  ('purchases', 'edit_po', 'Edit Purchase Order'),
  ('purchases', 'delete_po', 'Delete Purchase Order'),
  ('purchases', 'create_grn', 'Create GRN'),
  ('purchases', 'purchase_returns', 'Purchase Returns'),
  ('inventory', 'view', 'View Inventory'),
  ('inventory', 'view_stock', 'View Stock Levels'),
  ('inventory', 'adjust_stock', 'Adjust Stock'),
  ('inventory', 'stock_transfers', 'Stock Transfers'),
  ('inventory', 'damaged_stock', 'Manage Damaged Stock'),
  ('inventory', 'stock_reports', 'Stock Reports'),
  ('customers', 'view', 'View Customers'),
  ('customers', 'create', 'Create Customer'),
  ('customers', 'edit', 'Edit Customer'),
  ('customers', 'delete', 'Delete Customer'),
  ('customers', 'change_credit_limit', 'Change Credit Limit'),
  ('customers', 'view_credit_history', 'View Credit History'),
  ('suppliers', 'view', 'View Suppliers'),
  ('suppliers', 'create', 'Create Supplier'),
  ('suppliers', 'edit', 'Edit Supplier'),
  ('suppliers', 'delete', 'Delete Supplier'),
  ('quotations', 'view', 'View Quotations'),
  ('quotations', 'create', 'Create Quotation'),
  ('quotations', 'edit', 'Edit Quotation'),
  ('quotations', 'delete', 'Delete Quotation'),
  ('quotations', 'convert_to_invoice', 'Convert to Invoice'),
  ('quotations', 'approve', 'Approve Quotation'),
  ('accounts', 'view_ledger', 'View Ledger'),
  ('accounts', 'journal_entries', 'Journal Entries'),
  ('accounts', 'trial_balance', 'Trial Balance'),
  ('accounts', 'pnl', 'P&L Statement'),
  ('accounts', 'balance_sheet', 'Balance Sheet'),
  ('accounts', 'bank_reconciliation', 'Bank Reconciliation'),
  ('reports', 'sales_reports', 'Sales Reports'),
  ('reports', 'inventory_reports', 'Inventory Reports'),
  ('reports', 'financial_reports', 'Financial Reports'),
  ('reports', 'staff_performance', 'Staff Performance Reports'),
  ('reports', 'export_all', 'Export All Reports'),
  ('staff', 'view', 'View Staff'),
  ('staff', 'create', 'Create Staff'),
  ('staff', 'edit', 'Edit Staff'),
  ('staff', 'delete', 'Delete Staff'),
  ('staff', 'reset_password', 'Reset Staff Password'),
  ('staff', 'change_role', 'Change Staff Role'),
  ('staff', 'view_activity_logs', 'View Activity Logs'),
  ('settings', 'system', 'System Settings'),
  ('settings', 'branch', 'Branch Settings'),
  ('settings', 'tax', 'Tax Settings'),
  ('settings', 'permissions', 'User Permissions'),
  ('settings', 'backup', 'Backup/Restore'),
  ('branches', 'manage_all', 'Manage All Branches'),
  ('branches', 'manage_assigned', 'Manage Assigned Branch'),
  ('branches', 'branch_reports', 'Branch Reports')
ON CONFLICT (module, action) DO NOTHING;

-- Helper function to get permission ID
CREATE OR REPLACE FUNCTION get_perm_id(p_module TEXT, p_action TEXT) RETURNS UUID AS $$
  SELECT id FROM permissions WHERE module = p_module AND action = p_action;
$$ LANGUAGE SQL STABLE;

-- Super Admin (all permissions)
INSERT INTO role_permissions (role, permission_id)
SELECT 'super_admin', id FROM permissions
ON CONFLICT DO NOTHING;

-- Owner
INSERT INTO role_permissions (role, permission_id)
SELECT 'owner', id FROM permissions WHERE (module, action) IN (
  ('dashboard', 'view'), ('dashboard', 'view_branch_wise'), ('dashboard', 'view_financial_kpi'),
  ('pos', 'view'), ('pos', 'create_sale'), ('pos', 'void_sale'),
  ('pos', 'discount_up_to_10'), ('pos', 'discount_up_to_25'), ('pos', 'approve_credit'),
  ('purchases', 'view'), ('purchases', 'create_po'), ('purchases', 'edit_po'),
  ('purchases', 'create_grn'), ('purchases', 'purchase_returns'),
  ('inventory', 'view'), ('inventory', 'view_stock'), ('inventory', 'adjust_stock'),
  ('inventory', 'stock_transfers'), ('inventory', 'damaged_stock'), ('inventory', 'stock_reports'),
  ('customers', 'view'), ('customers', 'create'), ('customers', 'edit'),
  ('customers', 'change_credit_limit'), ('customers', 'view_credit_history'),
  ('suppliers', 'view'), ('suppliers', 'create'), ('suppliers', 'edit'),
  ('quotations', 'view'), ('quotations', 'create'), ('quotations', 'edit'),
  ('quotations', 'convert_to_invoice'), ('quotations', 'approve'),
  ('accounts', 'view_ledger'), ('accounts', 'journal_entries'),
  ('accounts', 'trial_balance'), ('accounts', 'pnl'), ('accounts', 'balance_sheet'),
  ('accounts', 'bank_reconciliation'),
  ('reports', 'sales_reports'), ('reports', 'inventory_reports'), ('reports', 'financial_reports'),
  ('reports', 'staff_performance'), ('reports', 'export_all'),
  ('staff', 'view'), ('staff', 'create'), ('staff', 'edit'),
  ('staff', 'reset_password'), ('staff', 'change_role'), ('staff', 'view_activity_logs'),
  ('settings', 'branch'), ('settings', 'tax'), ('settings', 'backup'),
  ('branches', 'manage_all'), ('branches', 'manage_assigned'), ('branches', 'branch_reports')
)
ON CONFLICT DO NOTHING;

-- Branch Manager
INSERT INTO role_permissions (role, permission_id)
SELECT 'branch_manager', id FROM permissions WHERE (module, action) IN (
  ('dashboard', 'view'), ('dashboard', 'view_branch_wise'), ('dashboard', 'view_financial_kpi'),
  ('pos', 'view'), ('pos', 'create_sale'), ('pos', 'void_sale'),
  ('pos', 'discount_up_to_10'), ('pos', 'discount_up_to_25'), ('pos', 'approve_credit'),
  ('purchases', 'view'), ('purchases', 'create_po'), ('purchases', 'edit_po'),
  ('purchases', 'create_grn'), ('purchases', 'purchase_returns'),
  ('inventory', 'view'), ('inventory', 'view_stock'), ('inventory', 'adjust_stock'),
  ('inventory', 'stock_transfers'), ('inventory', 'damaged_stock'), ('inventory', 'stock_reports'),
  ('customers', 'view'), ('customers', 'create'), ('customers', 'edit'),
  ('customers', 'change_credit_limit'), ('customers', 'view_credit_history'),
  ('suppliers', 'view'), ('suppliers', 'create'), ('suppliers', 'edit'),
  ('quotations', 'view'), ('quotations', 'create'), ('quotations', 'edit'),
  ('quotations', 'convert_to_invoice'), ('quotations', 'approve'),
  ('accounts', 'view_ledger'), ('accounts', 'journal_entries'),
  ('accounts', 'trial_balance'), ('accounts', 'pnl'), ('accounts', 'balance_sheet'),
  ('accounts', 'bank_reconciliation'),
  ('reports', 'sales_reports'), ('reports', 'inventory_reports'), ('reports', 'financial_reports'),
  ('reports', 'staff_performance'), ('reports', 'export_all'),
  ('staff', 'view'), ('staff', 'view_activity_logs'),
  ('branches', 'manage_assigned'), ('branches', 'branch_reports')
)
ON CONFLICT DO NOTHING;

-- Accountant
INSERT INTO role_permissions (role, permission_id)
SELECT 'accountant', id FROM permissions WHERE (module, action) IN (
  ('dashboard', 'view'), ('dashboard', 'view_financial_kpi'),
  ('pos', 'view'), ('pos', 'create_sale'),
  ('customers', 'view'), ('customers', 'create'), ('customers', 'edit'),
  ('customers', 'view_credit_history'),
  ('suppliers', 'view'),
  ('quotations', 'view'),
  ('accounts', 'view_ledger'), ('accounts', 'journal_entries'),
  ('accounts', 'trial_balance'), ('accounts', 'pnl'), ('accounts', 'balance_sheet'),
  ('accounts', 'bank_reconciliation'),
  ('reports', 'sales_reports'), ('reports', 'financial_reports'), ('reports', 'export_all'),
  ('settings', 'tax')
)
ON CONFLICT DO NOTHING;

-- Cashier
INSERT INTO role_permissions (role, permission_id)
SELECT 'cashier', id FROM permissions WHERE (module, action) IN (
  ('dashboard', 'view'),
  ('pos', 'view'), ('pos', 'create_sale'), ('pos', 'discount_up_to_10'),
  ('customers', 'view'),
  ('inventory', 'view'), ('inventory', 'view_stock')
)
ON CONFLICT DO NOTHING;

-- Store Keeper
INSERT INTO role_permissions (role, permission_id)
SELECT 'store_keeper', id FROM permissions WHERE (module, action) IN (
  ('dashboard', 'view'),
  ('inventory', 'view'), ('inventory', 'view_stock'), ('inventory', 'adjust_stock'),
  ('inventory', 'stock_transfers'), ('inventory', 'damaged_stock'), ('inventory', 'stock_reports'),
  ('purchases', 'view'), ('purchases', 'create_po'), ('purchases', 'edit_po'),
  ('purchases', 'create_grn'), ('purchases', 'purchase_returns'),
  ('suppliers', 'view'), ('suppliers', 'create'), ('suppliers', 'edit'),
  ('reports', 'inventory_reports')
)
ON CONFLICT DO NOTHING;

-- Sales Executive
INSERT INTO role_permissions (role, permission_id)
SELECT 'sales_executive', id FROM permissions WHERE (module, action) IN (
  ('dashboard', 'view'),
  ('pos', 'view'),
  ('customers', 'view'), ('customers', 'create'), ('customers', 'edit'),
  ('customers', 'view_credit_history'),
  ('quotations', 'view'), ('quotations', 'create'), ('quotations', 'edit'),
  ('quotations', 'convert_to_invoice')
)
ON CONFLICT DO NOTHING;

-- Backfill staff_code for existing profiles using EMP-XXXX format
DO $$
DECLARE
  r RECORD;
  seq INT;
BEGIN
  seq := 0;
  FOR r IN SELECT id FROM profiles WHERE staff_code IS NULL ORDER BY created_at LOOP
    seq := seq + 1;
    UPDATE profiles SET staff_code = CONCAT('EMP-', LPAD(seq::TEXT, 4, '0')) WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE profiles ALTER COLUMN staff_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_staff_code ON profiles(staff_code);
