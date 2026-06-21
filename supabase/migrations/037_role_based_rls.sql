-- Role-based RLS policies
-- Replaces blanket "authenticated users can do everything" with role-aware policies

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION public.user_role() RETURNS TEXT AS $$
  SELECT COALESCE(role::TEXT, 'cashier') FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper: check if user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(p_module TEXT, p_action TEXT) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role = public.user_role()::user_role
      AND p.module = p_module
      AND p.action = p_action
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ===== PROFILES =====
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON profiles;

CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT TO authenticated
  USING (public.user_role() IN ('super_admin', 'owner'));

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage profiles" ON profiles
  FOR ALL TO authenticated
  USING (public.user_role() IN ('super_admin', 'owner'))
  WITH CHECK (public.user_role() IN ('super_admin', 'owner'));

-- Allow the trigger to insert profiles
CREATE POLICY "System can insert profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ===== PERMISSIONS (read-only for all, managed via migration) =====
DROP POLICY IF EXISTS "Authenticated users can read permissions" ON permissions;
DROP POLICY IF EXISTS "Authenticated users can insert permissions" ON permissions;
DROP POLICY IF EXISTS "Authenticated users can update permissions" ON permissions;
DROP POLICY IF EXISTS "Authenticated users can delete permissions" ON permissions;
DROP POLICY IF EXISTS "Anyone can read permissions" ON permissions;
DROP POLICY IF EXISTS "Only super_admin can manage permissions" ON permissions;

CREATE POLICY "Anyone can read permissions" ON permissions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only super_admin can manage permissions" ON permissions
  FOR ALL TO authenticated
  USING (public.user_role() = 'super_admin')
  WITH CHECK (public.user_role() = 'super_admin');

-- ===== ROLE PERMISSIONS (read-only for all, managed via migration) =====
DROP POLICY IF EXISTS "Authenticated users can read role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Authenticated users can insert role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Authenticated users can update role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Authenticated users can delete role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Anyone can read role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Only super_admin can manage role_permissions" ON role_permissions;

CREATE POLICY "Anyone can read role_permissions" ON role_permissions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only super_admin can manage role_permissions" ON role_permissions
  FOR ALL TO authenticated
  USING (public.user_role() = 'super_admin')
  WITH CHECK (public.user_role() = 'super_admin');

-- ===== AUDIT LOG =====
DROP POLICY IF EXISTS "Authenticated users can read audit_log" ON audit_log;
DROP POLICY IF EXISTS "Authenticated users can insert audit_log" ON audit_log;
DROP POLICY IF EXISTS "Authenticated users can update audit_log" ON audit_log;
DROP POLICY IF EXISTS "Authenticated users can delete audit_log" ON audit_log;
DROP POLICY IF EXISTS "Users can read own audit log" ON audit_log;
DROP POLICY IF EXISTS "Super admin and owner can read all audit logs" ON audit_log;
DROP POLICY IF EXISTS "Anyone can insert audit_log" ON audit_log;

CREATE POLICY "Users can read own audit log" ON audit_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admin and owner can read all audit logs" ON audit_log
  FOR SELECT TO authenticated
  USING (public.user_role() IN ('super_admin', 'owner'));

CREATE POLICY "Anyone can insert audit_log" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- No updates or deletes on audit_log (immutable)
