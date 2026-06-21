-- Migration 040: Add audit-log to sidebar for super_admin, owner, and branch_manager

INSERT INTO role_sidebar_items (role, module)
SELECT 'super_admin', 'audit-log'
WHERE NOT EXISTS (
  SELECT 1 FROM role_sidebar_items WHERE role = 'super_admin' AND module = 'audit-log'
);

INSERT INTO role_sidebar_items (role, module)
SELECT 'owner', 'audit-log'
WHERE NOT EXISTS (
  SELECT 1 FROM role_sidebar_items WHERE role = 'owner' AND module = 'audit-log'
);

INSERT INTO role_sidebar_items (role, module)
SELECT 'branch_manager', 'audit-log'
WHERE NOT EXISTS (
  SELECT 1 FROM role_sidebar_items WHERE role = 'branch_manager' AND module = 'audit-log'
);
