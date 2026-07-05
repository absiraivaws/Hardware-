-- Create tasks table for approval workflow

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_number TEXT NOT NULL UNIQUE,
  assign_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  related_module TEXT NOT NULL,
  user_action TEXT NOT NULL CHECK (user_action IN ('edit', 'delete', 'create')),
  entity_id TEXT,
  entity_description TEXT,
  before_values JSONB DEFAULT '{}',
  new_values JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Only super_admin and owner can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'owner')
    )
  );
