-- Migration 041: Add audit-log sidebar item for branch_manager

INSERT INTO role_sidebar_items (role, module)
SELECT 'branch_manager', 'audit-log'
WHERE NOT EXISTS (
  SELECT 1 FROM role_sidebar_items WHERE role = 'branch_manager' AND module = 'audit-log'
);
